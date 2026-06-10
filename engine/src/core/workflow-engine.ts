import { readFileSync, existsSync, readdirSync } from 'fs';
import { basename, resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import { ulid } from 'ulid';
import type { SQLQueryBindings } from 'bun:sqlite';
import { getDb } from '../lib/db';
import { log } from '../lib/logger';
import { broadcast } from '../lib/ws';
import { aiosCorePath } from '../lib/config';
import * as queue from './job-queue';
import type { EngineConfig, Job, WorkflowState, WorkflowStatus, WSEventType } from '../types';

// ============================================================
// Workflow Engine — Story 3.3 (State Machine)
// ============================================================

let _config: EngineConfig;

// Parsed workflow definitions cache
const definitionCache = new Map<string, ParsedWorkflow>();

// -- Types --

interface ParsedWorkflow {
  id: string;
  name: string;
  description: string;
  type: 'generic' | 'loop';
  phases: ParsedPhase[];
  entryPhaseId: string;
  config?: Record<string, unknown>;
}

interface ParsedPhase {
  id: string;
  name: string;
  agent: string;
  squad?: string;
  action: string;
  next: string | null;        // next phase on success
  onFailure: string | null;   // next phase on failure (or retry)
  onBlocked?: string | null;  // escalation target
  maxIterations?: number;
  phase: number;
}

// -- Initialization --

export function initWorkflowEngine(cfg: EngineConfig): void {
  _config = cfg;
  loadWorkflowDefinitions();
}

// -- Public API --

export function startWorkflow(
  definitionId: string,
  inputPayload: Record<string, unknown>,
  parentJobId?: string,
): WorkflowState {
  const definition = definitionCache.get(definitionId);
  if (!definition) {
    throw new Error(`Workflow definition "${definitionId}" not found. Available: ${[...definitionCache.keys()].join(', ')}`);
  }

  const db = getDb();
  const id = ulid();
  const workflowId = `wf-${id}`;

  const state: WorkflowState = {
    id,
    workflow_id: workflowId,
    definition_id: definitionId,
    current_phase: definition.entryPhaseId,
    status: 'pending',
    phase_history: '[]',
    iteration_count: 0,
    parent_job_id: parentJobId ?? null,
    input_payload: JSON.stringify(inputPayload),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.run(
    `INSERT INTO workflow_state (id, workflow_id, definition_id, current_phase, status,
      phase_history, iteration_count, parent_job_id, input_payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [state.id, state.workflow_id, state.definition_id, state.current_phase,
     state.status, state.phase_history, state.iteration_count,
     state.parent_job_id, state.input_payload, state.created_at, state.updated_at],
  );

  log.info('Workflow started', {
    id: state.id,
    workflowId: state.workflow_id,
    definition: definitionId,
    entryPhase: definition.entryPhaseId,
  });

  // Kick off first phase
  executePhase(state, definition);

  return state;
}

export function onJobCompleted(job: Job): void {
  if (!job.workflow_id) return;

  const state = getWorkflowState(job.workflow_id);
  if (!state || state.status !== 'running') return;

  const definition = definitionCache.get(state.definition_id);
  if (!definition) return;

  const currentPhase = definition.phases.find(p => p.id === state.current_phase);
  if (!currentPhase) return;

  const success = job.status === 'done';
  const verdict = success ? detectVerdict(job.output_result ?? '') : 'FAIL';

  log.info('Workflow phase completed', {
    workflowId: state.workflow_id,
    phase: currentPhase.id,
    jobId: job.id,
    success,
    verdict,
  });

  // Record phase in history
  const history = JSON.parse(state.phase_history) as Array<Record<string, unknown>>;
  history.push({
    phase: currentPhase.id,
    agent: currentPhase.agent,
    jobId: job.id,
    result: success ? 'success' : 'failed',
    verdict,
    timestamp: new Date().toISOString(),
  });

  broadcast('workflow:phase_completed', {
    workflowId: state.workflow_id,
    phase: currentPhase.id,
    agent: currentPhase.agent,
    result: success ? 'success' : 'failed',
    verdict,
  });

  // Determine next phase
  let nextPhaseId: string | null = null;

  if (success && (verdict === 'GO' || verdict === 'PASS' || verdict === 'APPROVE' || verdict === 'SUCCESS')) {
    nextPhaseId = currentPhase.next;
  } else if (verdict === 'BLOCKED') {
    nextPhaseId = currentPhase.onBlocked ?? null;
  } else if (!success || verdict === 'NO-GO' || verdict === 'FAIL' || verdict === 'REJECT') {
    // Check iteration limit for loops
    if (definition.type === 'loop') {
      const maxIter = currentPhase.maxIterations ??
                      (definition.config?.maxIterations as number) ?? 5;
      if (state.iteration_count >= maxIter) {
        log.warn('Workflow max iterations reached', {
          workflowId: state.workflow_id,
          iterations: state.iteration_count,
          max: maxIter,
        });
        completeWorkflow(state, 'failed', history, 'Max iterations reached');
        return;
      }
    }
    nextPhaseId = currentPhase.onFailure;
  }

  if (!nextPhaseId || nextPhaseId === 'complete') {
    // Workflow complete
    const finalStatus: WorkflowStatus = success ? 'completed' : 'failed';
    completeWorkflow(state, finalStatus, history);
    return;
  }

  // Transition to next phase
  const iterationCount = (currentPhase.onFailure === nextPhaseId)
    ? state.iteration_count + 1
    : state.iteration_count;

  updateWorkflowState(state.id, {
    current_phase: nextPhaseId,
    phase_history: JSON.stringify(history),
    iteration_count: iterationCount,
    updated_at: new Date().toISOString(),
  });

  // Reload state and execute next phase
  const updatedState = getWorkflowState(state.workflow_id);
  if (updatedState) {
    executePhase(updatedState, definition);
  }
}

export function getWorkflowStateById(id: string): WorkflowState | null {
  const db = getDb();
  return db.query<WorkflowState, [string]>(
    'SELECT * FROM workflow_state WHERE id = ?'
  ).get(id) ?? null;
}

export function getWorkflowState(workflowId: string): WorkflowState | null {
  const db = getDb();
  return db.query<WorkflowState, [string]>(
    'SELECT * FROM workflow_state WHERE workflow_id = ?'
  ).get(workflowId) ?? null;
}

export function listWorkflows(status?: WorkflowStatus, limit = 20): WorkflowState[] {
  const db = getDb();
  if (status) {
    return db.query<WorkflowState, [string, number]>(
      'SELECT * FROM workflow_state WHERE status = ? ORDER BY created_at DESC LIMIT ?'
    ).all(status, limit);
  }
  return db.query<WorkflowState, [number]>(
    'SELECT * FROM workflow_state ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
}

export function pauseWorkflow(workflowId: string): void {
  const state = getWorkflowState(workflowId);
  if (!state || state.status !== 'running') {
    throw new Error(`Workflow ${workflowId} is not running`);
  }

  updateWorkflowState(state.id, {
    status: 'paused',
    updated_at: new Date().toISOString(),
  });

  log.info('Workflow paused', { workflowId });
}

export function resumeWorkflow(workflowId: string): void {
  const state = getWorkflowState(workflowId);
  if (!state || state.status !== 'paused') {
    throw new Error(`Workflow ${workflowId} is not paused`);
  }

  const definition = definitionCache.get(state.definition_id);
  if (!definition) {
    throw new Error(`Workflow definition ${state.definition_id} not found`);
  }

  updateWorkflowState(state.id, {
    status: 'running',
    updated_at: new Date().toISOString(),
  });

  executePhase(state, definition);
  log.info('Workflow resumed', { workflowId, phase: state.current_phase });
}

export function getAvailableWorkflows(): Array<{ id: string; name: string; description: string; type: string; phases: number }> {
  return [...definitionCache.values()].map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    type: w.type,
    phases: w.phases.length,
  }));
}

// -- Internal --

function executePhase(state: WorkflowState, definition: ParsedWorkflow): void {
  const phase = definition.phases.find(p => p.id === state.current_phase);
  if (!phase) {
    log.error('Phase not found in workflow', {
      workflowId: state.workflow_id,
      phase: state.current_phase,
    });
    completeWorkflow(state, 'failed', [], `Phase "${state.current_phase}" not found`);
    return;
  }

  // Update state to running
  updateWorkflowState(state.id, {
    status: 'running',
    updated_at: new Date().toISOString(),
  });

  // Parse input payload for the phase
  const inputPayload = JSON.parse(state.input_payload);

  // Determine squad from agent
  const squadId = phase.squad || inferSquadFromAgent(phase.agent);

  log.info('Executing workflow phase', {
    workflowId: state.workflow_id,
    phase: phase.id,
    agent: phase.agent,
    squad: squadId,
    action: phase.action,
    iteration: state.iteration_count,
  });

  broadcast('workflow:phase_started', {
    workflowId: state.workflow_id,
    phase: phase.id,
    agent: phase.agent,
    action: phase.action,
    iteration: state.iteration_count,
  });

  // Create a child job for this phase
  const job = queue.enqueue({
    squad_id: squadId,
    agent_id: phase.agent,
    input_payload: {
      message: phase.action,
      command: `workflow:${definition.id}:${phase.id}`,
      context: {
        workflow_id: state.workflow_id,
        workflow_name: definition.name,
        phase_id: phase.id,
        phase_name: phase.name,
        iteration: state.iteration_count,
        ...inputPayload,
      },
    },
    priority: 1, // High priority for workflow phases
    trigger_type: 'workflow',
    workflow_id: state.workflow_id,
    parent_job_id: state.parent_job_id ?? undefined,
  });

  log.info('Workflow phase job created', {
    workflowId: state.workflow_id,
    phase: phase.id,
    jobId: job.id,
  });
}

function completeWorkflow(
  state: WorkflowState,
  status: WorkflowStatus,
  history: Array<Record<string, unknown>>,
  errorMessage?: string,
): void {
  updateWorkflowState(state.id, {
    status,
    phase_history: JSON.stringify(history),
    updated_at: new Date().toISOString(),
  });

  const eventType = status === 'completed' ? 'workflow:completed' : 'workflow:failed';
  broadcast(eventType as WSEventType, {
    workflowId: state.workflow_id,
    definitionId: state.definition_id,
    status,
    totalPhases: history.length,
    iterations: state.iteration_count,
    error: errorMessage,
  });

  log.info('Workflow completed', {
    workflowId: state.workflow_id,
    status,
    phases: history.length,
    iterations: state.iteration_count,
  });
}

function updateWorkflowState(id: string, fields: Partial<WorkflowState>): void {
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
  params.push(id);
  db.run(`UPDATE workflow_state SET ${sets.join(', ')} WHERE id = ?`, params as SQLQueryBindings[]);
}

function detectVerdict(output: string): string {
  const lower = output.toLowerCase();

  // Check for explicit verdicts
  if (lower.includes('approve') || lower.includes('aprovad')) return 'APPROVE';
  if (lower.includes('reject') || lower.includes('rejeitad')) return 'REJECT';
  if (lower.includes('blocked') || lower.includes('bloquead')) return 'BLOCKED';
  if (lower.includes('pass') || lower.includes('passou')) return 'PASS';
  if (lower.includes('fail') || lower.includes('falhou')) return 'FAIL';
  if (lower.includes('no-go') || lower.includes('no go')) return 'NO-GO';
  if (lower.includes('go')) return 'GO';

  // Default: if output exists, assume success
  return output.trim().length > 0 ? 'SUCCESS' : 'FAIL';
}

function inferSquadFromAgent(agentId: string): string {
  const agentSquadMap: Record<string, string> = {
    sm: 'orchestrator',
    po: 'orchestrator',
    pm: 'orchestrator',
    dev: 'development',
    qa: 'development',
    architect: 'engineering',
    analyst: 'analytics',
    devops: 'engineering',
    'data-engineer': 'engineering',
    'ux-expert': 'design',
    'ux-design-expert': 'design',
  };

  return agentSquadMap[agentId.toLowerCase()] || 'orchestrator';
}

// -- YAML Loading --

function loadWorkflowDefinitions(): void {
  const workflowDirs = [
    aiosCorePath('development', 'workflows'),
  ];

  let loaded = 0;

  for (const dir of workflowDirs) {
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of files) {
      try {
        const content = readFileSync(resolve(dir, file), 'utf-8');
        const parsed = parseWorkflowYaml(content, file);
        if (parsed) {
          definitionCache.set(parsed.id, parsed);
          loaded++;
        }
      } catch (err) {
        log.warn('Failed to parse workflow', {
          file,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (loaded > 0) break; // Use first directory that has files
  }

  log.info('Workflow definitions loaded', {
    count: loaded,
    ids: [...definitionCache.keys()],
  });
}

function parseWorkflowYaml(content: string, filename: string): ParsedWorkflow | null {
  const raw = parseYaml(content);
  if (!raw?.workflow) return null;

  const wf = raw.workflow;
  const id = wf.id || basename(filename, '.yaml');
  const isLoop = wf.type === 'loop';

  // Parse sequence steps into phases
  const phases: ParsedPhase[] = [];

  if (wf.sequence) {
    for (const step of wf.sequence) {
      // Each step can be an object with a named key or flat
      const stepData = step.step ? step : Object.values(step)[0] as Record<string, unknown>;
      if (!stepData || stepData === 'complete') continue;

      // Skip workflow_end entries
      if (step.workflow_end || stepData.action === 'story_complete') continue;

      phases.push({
        id: stepData.id || stepData.step || `phase_${phases.length}`,
        name: stepData.action || stepData.step || `Phase ${phases.length + 1}`,
        agent: stepData.agent || 'dev',
        squad: stepData.squad,
        action: stepData.action || stepData.notes?.split('\n')[0] || 'Execute phase',
        next: stepData.next || null,
        onFailure: stepData.on_failure || null,
        onBlocked: stepData.on_blocked || null,
        maxIterations: stepData.max_iterations,
        phase: stepData.phase || phases.length + 1,
      });
    }
  }

  // For loop-type workflows (qa-loop), check for steps/phases in different format
  if (wf.steps && phases.length === 0) {
    for (const step of wf.steps) {
      const stepData = typeof step === 'object' ? step : {};
      phases.push({
        id: stepData.id || `step_${phases.length}`,
        name: stepData.name || stepData.action || `Step ${phases.length + 1}`,
        agent: stepData.agent || 'qa',
        squad: stepData.squad,
        action: stepData.action || 'Execute step',
        next: stepData.next || null,
        onFailure: stepData.on_failure || null,
        onBlocked: stepData.on_blocked || null,
        maxIterations: stepData.max_iterations,
        phase: phases.length + 1,
      });
    }
  }

  if (phases.length === 0) {
    log.debug('Workflow has no parseable phases', { id, filename });
    return null;
  }

  return {
    id,
    name: wf.name || id,
    description: wf.description || '',
    type: isLoop ? 'loop' : 'generic',
    phases,
    entryPhaseId: phases[0].id,
    config: wf.config,
  };
}
