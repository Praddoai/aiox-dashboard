import { log } from '../lib/logger';
import { broadcast } from '../lib/ws';
import * as queue from './job-queue';
import type { Job, CreateJobInput } from '../types';

// ============================================================
// Delegation Protocol — Story 3.4
// Squad lead delegates sub-tasks to workers via output markers
// ============================================================

export interface DelegationRequest {
  taskId: string;
  agentId: string;
  squadId?: string;
  message: string;
  dependsOn?: string[];       // other taskIds that must complete first
  priority?: number;
}

interface DelegationResult {
  parentJobId: string;
  subJobs: Array<{ taskId: string; jobId: string }>;
  hasDependencies: boolean;
}

// Parse delegation markers from agent output
// Format: <!-- DELEGATE: {"tasks":[...]} -->
export function parseDelegation(output: string): DelegationRequest[] | null {
  const delegations: DelegationRequest[] = [];

  // Pattern 1: HTML comment block
  const commentRegex = /<!--\s*DELEGATE:\s*(\{[\s\S]*?\})\s*-->/g;
  let match: RegExpExecArray | null;

  while ((match = commentRegex.exec(output)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        delegations.push(...parsed.tasks);
      } else if (parsed.taskId && parsed.agentId) {
        delegations.push(parsed);
      }
    } catch (err) {
      log.warn('Failed to parse delegation marker', {
        raw: match[1].slice(0, 200),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Pattern 2: JSON code block with delegation header
  const codeBlockRegex = /```(?:json)?\s*\n\s*\{\s*"delegation"\s*:\s*(\[[\s\S]*?\])\s*\}\s*\n```/g;
  while ((match = codeBlockRegex.exec(output)) !== null) {
    try {
      const tasks = JSON.parse(match[1]);
      delegations.push(...tasks);
    } catch { /* skip malformed */ }
  }

  return delegations.length > 0 ? delegations : null;
}

// Create sub-jobs from delegation requests
export function executeDelegation(
  parentJob: Job,
  delegations: DelegationRequest[],
): DelegationResult {
  const subJobs: Array<{ taskId: string; jobId: string }> = [];
  const hasDependencies = delegations.some(d => d.dependsOn && d.dependsOn.length > 0);

  // Separate into parallel (no deps) and sequential (has deps)
  const parallel = delegations.filter(d => !d.dependsOn || d.dependsOn.length === 0);
  const sequential = delegations.filter(d => d.dependsOn && d.dependsOn.length > 0);

  // Create parallel sub-jobs immediately
  for (const task of parallel) {
    const job = queue.enqueue({
      squad_id: task.squadId || parentJob.squad_id,
      agent_id: task.agentId,
      input_payload: {
        message: task.message,
        context: {
          delegated_from: parentJob.id,
          delegation_task_id: task.taskId,
          parent_agent: parentJob.agent_id,
          parent_squad: parentJob.squad_id,
        },
      },
      priority: (task.priority ?? parentJob.priority) as CreateJobInput['priority'],
      trigger_type: 'workflow',
      parent_job_id: parentJob.id,
      workflow_id: parentJob.workflow_id ?? undefined,
    });

    subJobs.push({ taskId: task.taskId, jobId: job.id });
  }

  // Store sequential tasks for barrier sync
  if (sequential.length > 0) {
    storePendingDelegations(parentJob.id, sequential, subJobs);
  }

  log.info('Delegation executed', {
    parentJobId: parentJob.id,
    parallel: parallel.length,
    sequential: sequential.length,
    totalSubJobs: subJobs.length,
  });

  broadcast('job:progress', {
    jobId: parentJob.id,
    type: 'delegation',
    subJobs: subJobs.length,
    pending: sequential.length,
  });

  return {
    parentJobId: parentJob.id,
    subJobs,
    hasDependencies,
  };
}

// Check if all dependencies for sequential tasks are met
export function checkBarrierSync(parentJobId: string): DelegationRequest[] | null {
  const pending = getPendingDelegations(parentJobId);
  if (!pending || pending.length === 0) return null;

  const completedTaskIds = getCompletedTaskIds(parentJobId);
  const ready: DelegationRequest[] = [];

  for (const task of pending) {
    if (!task.dependsOn || task.dependsOn.length === 0) continue;

    const allDepsComplete = task.dependsOn.every(dep => completedTaskIds.has(dep));
    if (allDepsComplete) {
      ready.push(task);
    }
  }

  return ready.length > 0 ? ready : null;
}

// Called when a sub-job completes
export function onSubJobCompleted(job: Job): void {
  if (!job.parent_job_id) return;

  // Check if this was a delegated task
  const context = tryParseContext(job);
  const taskId = context?.delegation_task_id as string | undefined;

  if (taskId) {
    markTaskCompleted(job.parent_job_id, taskId);
  }

  // Check barrier sync for sequential tasks
  const readyTasks = checkBarrierSync(job.parent_job_id);
  if (readyTasks) {
    const parentJob = queue.getJob(job.parent_job_id);
    if (parentJob) {
      executeDelegation(parentJob, readyTasks);
      removePendingDelegations(job.parent_job_id, readyTasks.map(t => t.taskId));
    }
  }

  // Check if ALL sub-jobs are complete
  const allComplete = checkAllSubJobsComplete(job.parent_job_id);
  if (allComplete) {
    log.info('All delegated sub-jobs completed', { parentJobId: job.parent_job_id });
    broadcast('job:progress', {
      jobId: job.parent_job_id,
      type: 'delegation_complete',
      allSubJobsDone: true,
    });

    // Aggregate results for the parent squad lead
    aggregateResultsForLead(job.parent_job_id);
  }
}

// -- Internal storage (in-memory for now, could be SQLite) --

const pendingDelegations = new Map<string, {
  tasks: DelegationRequest[];
  taskIdToJobId: Map<string, string>;
  completedTaskIds: Set<string>;
}>();

function storePendingDelegations(
  parentJobId: string,
  tasks: DelegationRequest[],
  existingSubJobs: Array<{ taskId: string; jobId: string }>,
): void {
  const existing = pendingDelegations.get(parentJobId) || {
    tasks: [] as DelegationRequest[],
    taskIdToJobId: new Map<string, string>(),
    completedTaskIds: new Set<string>(),
  };

  existing.tasks.push(...tasks);
  for (const sj of existingSubJobs) {
    existing.taskIdToJobId.set(sj.taskId, sj.jobId);
  }

  pendingDelegations.set(parentJobId, existing);
}

function getPendingDelegations(parentJobId: string): DelegationRequest[] | null {
  return pendingDelegations.get(parentJobId)?.tasks ?? null;
}

function getCompletedTaskIds(parentJobId: string): Set<string> {
  return pendingDelegations.get(parentJobId)?.completedTaskIds ?? new Set();
}

function markTaskCompleted(parentJobId: string, taskId: string): void {
  const state = pendingDelegations.get(parentJobId);
  if (state) {
    state.completedTaskIds.add(taskId);
  }
}

function removePendingDelegations(parentJobId: string, taskIds: string[]): void {
  const state = pendingDelegations.get(parentJobId);
  if (state) {
    state.tasks = state.tasks.filter(t => !taskIds.includes(t.taskId));
  }
}

function checkAllSubJobsComplete(parentJobId: string): boolean {
  const { jobs } = queue.listJobs({ limit: 100 });
  const subJobs = jobs.filter(j => j.parent_job_id === parentJobId);

  if (subJobs.length === 0) return false;

  return subJobs.every(j =>
    j.status === 'done' || j.status === 'failed' || j.status === 'cancelled'
  );
}

function aggregateResultsForLead(parentJobId: string): void {
  const { jobs } = queue.listJobs({ limit: 100 });
  const subJobs = jobs.filter(j => j.parent_job_id === parentJobId);

  const results = subJobs.map(j => ({
    jobId: j.id,
    agentId: j.agent_id,
    status: j.status,
    output: j.output_result?.slice(0, 1000),
    error: j.error_message,
  }));

  const succeeded = subJobs.filter(j => j.status === 'done').length;
  const failed = subJobs.filter(j => j.status === 'failed').length;

  log.info('Delegation results aggregated', {
    parentJobId,
    total: subJobs.length,
    succeeded,
    failed,
  });

  broadcast('job:progress', {
    jobId: parentJobId,
    type: 'delegation_results',
    total: subJobs.length,
    succeeded,
    failed,
    results,
  });

  // Clean up
  pendingDelegations.delete(parentJobId);
}

function tryParseContext(job: Job): Record<string, unknown> | null {
  try {
    const payload = JSON.parse(job.input_payload);
    return payload.context ?? null;
  } catch {
    return null;
  }
}
