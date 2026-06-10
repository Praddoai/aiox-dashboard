import { ulid } from 'ulid';
import type { SQLQueryBindings } from 'bun:sqlite';
import { getDb } from '../lib/db';
import { broadcast } from '../lib/ws';
import { log } from '../lib/logger';
import type { Job, JobStatus, CreateJobInput } from '../types';

// Valid state transitions
const VALID_TRANSITIONS: Record<string, JobStatus[]> = {
  pending:   ['running', 'cancelled', 'rejected'],
  running:   ['done', 'failed', 'timeout', 'cancelled'],
  done:      [],
  failed:    ['pending'], // retry
  timeout:   ['pending'], // retry
  rejected:  [],
  cancelled: [],
};

export function enqueue(input: CreateJobInput): Job {
  const db = getDb();
  const id = ulid();

  const job: Job = {
    id,
    squad_id: input.squad_id,
    agent_id: input.agent_id,
    status: 'pending',
    priority: input.priority ?? 2,
    input_payload: JSON.stringify(input.input_payload),
    output_result: null,
    context_hash: null,
    parent_job_id: input.parent_job_id ?? null,
    workflow_id: input.workflow_id ?? null,
    trigger_type: input.trigger_type ?? 'gui',
    callback_url: input.callback_url ?? null,
    workspace_dir: null,
    pid: null,
    attempts: 0,
    max_attempts: input.max_attempts ?? 3,
    timeout_ms: input.timeout_ms ?? 300_000,
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    error_message: null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  };

  db.run(
    `INSERT INTO jobs (id, squad_id, agent_id, status, priority, input_payload,
      parent_job_id, workflow_id, trigger_type, callback_url, max_attempts,
      timeout_ms, created_at, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.id, job.squad_id, job.agent_id, job.status, job.priority,
      job.input_payload, job.parent_job_id, job.workflow_id,
      job.trigger_type, job.callback_url, job.max_attempts,
      job.timeout_ms, job.created_at, job.metadata,
    ]
  );

  log.info('Job enqueued', { id, squad: input.squad_id, agent: input.agent_id, priority: job.priority });
  broadcast('job:created', { jobId: id, squadId: input.squad_id, agentId: input.agent_id, priority: job.priority });

  return job;
}

export function dequeue(): Job | null {
  const db = getDb();

  // Highest priority first (0=urgent), then oldest first
  const row = db.query<Job, []>(
    `SELECT * FROM jobs
     WHERE status = 'pending'
     ORDER BY priority ASC, created_at ASC
     LIMIT 1`
  ).get();

  return row ?? null;
}

// Update fields without changing status
export function updateFields(
  jobId: string,
  fields: Partial<Pick<Job, 'output_result' | 'error_message' | 'pid' | 'workspace_dir' | 'context_hash'>>,
): void {
  const db = getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (sets.length === 0) return;
  params.push(jobId);
  db.run(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`, params as SQLQueryBindings[]);
}

export function updateStatus(
  jobId: string,
  newStatus: JobStatus,
  extra?: Partial<Pick<Job, 'output_result' | 'error_message' | 'pid' | 'workspace_dir' | 'context_hash'>>
): void {
  const db = getDb();
  const current = getJob(jobId);
  if (!current) throw new Error(`Job ${jobId} not found`);

  const allowed = VALID_TRANSITIONS[current.status];
  if (!allowed?.includes(newStatus)) {
    throw new Error(`Invalid transition: ${current.status} → ${newStatus} for job ${jobId}`);
  }

  const now = new Date().toISOString();
  const sets: string[] = ['status = ?'];
  const params: unknown[] = [newStatus];

  if (newStatus === 'running') {
    sets.push('started_at = ?', 'attempts = attempts + 1');
    params.push(now);
  }

  if (newStatus === 'done' || newStatus === 'failed' || newStatus === 'timeout') {
    sets.push('completed_at = ?');
    params.push(now);
  }

  if (extra?.output_result !== undefined) {
    sets.push('output_result = ?');
    params.push(extra.output_result);
  }
  if (extra?.error_message !== undefined) {
    sets.push('error_message = ?');
    params.push(extra.error_message);
  }
  if (extra?.pid !== undefined) {
    sets.push('pid = ?');
    params.push(extra.pid);
  }
  if (extra?.workspace_dir !== undefined) {
    sets.push('workspace_dir = ?');
    params.push(extra.workspace_dir);
  }
  if (extra?.context_hash !== undefined) {
    sets.push('context_hash = ?');
    params.push(extra.context_hash);
  }

  params.push(jobId);
  db.run(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`, params as SQLQueryBindings[]);

  log.info('Job status updated', { id: jobId, from: current.status, to: newStatus });
}

export function getJob(id: string): Job | null {
  const db = getDb();
  return db.query<Job, [string]>('SELECT * FROM jobs WHERE id = ?').get(id) ?? null;
}

export function listJobs(filters?: {
  status?: JobStatus;
  squad_id?: string;
  agent_id?: string;
  limit?: number;
  offset?: number;
}): { jobs: Job[]; total: number } {
  const db = getDb();
  const wheres: string[] = [];
  const params: unknown[] = [];

  if (filters?.status) {
    wheres.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.squad_id) {
    wheres.push('squad_id = ?');
    params.push(filters.squad_id);
  }
  if (filters?.agent_id) {
    wheres.push('agent_id = ?');
    params.push(filters.agent_id);
  }

  const where = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const total = db.query<{ count: number }, SQLQueryBindings[]>(
    `SELECT COUNT(*) as count FROM jobs ${where}`
  ).get(...(params as SQLQueryBindings[]))?.count ?? 0;

  const jobs = db.query<Job, SQLQueryBindings[]>(
    `SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...(params as SQLQueryBindings[]), limit, offset);

  return { jobs, total };
}

export function retryJob(jobId: string): Job {
  const job = getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (job.status !== 'failed' && job.status !== 'timeout') {
    throw new Error(`Can only retry failed/timeout jobs, current: ${job.status}`);
  }
  if (job.attempts >= job.max_attempts) {
    throw new Error(`Job ${jobId} exceeded max attempts (${job.max_attempts})`);
  }

  updateStatus(jobId, 'pending');
  return getJob(jobId)!;
}

export function cancelJob(jobId: string): void {
  const job = getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  if (job.status === 'running' && job.pid) {
    try {
      process.kill(job.pid, 'SIGTERM');
    } catch {
      // Process already dead
    }
  }

  if (job.status === 'pending' || job.status === 'running') {
    updateStatus(jobId, 'cancelled');
  }
}

export function getQueueDepth(): number {
  const db = getDb();
  return db.query<{ count: number }, []>(
    `SELECT COUNT(*) as count FROM jobs WHERE status = 'pending'`
  ).get()?.count ?? 0;
}

export function getRunningCount(): number {
  const db = getDb();
  return db.query<{ count: number }, []>(
    `SELECT COUNT(*) as count FROM jobs WHERE status = 'running'`
  ).get()?.count ?? 0;
}

export function getRunningBySquad(squadId: string): number {
  const db = getDb();
  return db.query<{ count: number }, [string]>(
    `SELECT COUNT(*) as count FROM jobs WHERE status = 'running' AND squad_id = ?`
  ).get(squadId)?.count ?? 0;
}

// Mark timed-out jobs
export function checkTimeouts(): number {
  const db = getDb();
  const now = Date.now();

  const running = db.query<Pick<Job, 'id' | 'started_at' | 'timeout_ms' | 'pid'>, []>(
    `SELECT id, started_at, timeout_ms, pid FROM jobs WHERE status = 'running'`
  ).all();

  let count = 0;
  for (const job of running) {
    if (!job.started_at) continue;
    const elapsed = now - new Date(job.started_at).getTime();
    if (elapsed > job.timeout_ms) {
      // Kill process
      if (job.pid) {
        try { process.kill(job.pid, 'SIGTERM'); } catch { /* already dead */ }
      }
      updateStatus(job.id, 'timeout', { error_message: `Exceeded timeout of ${job.timeout_ms}ms` });
      broadcast('job:failed', { jobId: job.id, reason: 'timeout' });
      count++;
    }
  }

  return count;
}
