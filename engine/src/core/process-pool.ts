import { log } from '../lib/logger';
import { broadcast } from '../lib/ws';
import * as queue from './job-queue';
import { buildContext, initContextBuilder } from './context-builder';
import { createWorkspace, initWorkspaceManager, type WorkspaceInfo } from './workspace-manager';
import { handleCompletion, initCompletionHandler } from './completion-handler';
import { canExecute, initAuthorityEnforcer } from './authority-enforcer';
import type { EngineConfig, Job, PoolSlot, PoolStatus } from '../types';

// ============================================================
// Process Pool — Story 3.1 (Event-Driven, N Slots, Preemption)
// ============================================================

let slots: PoolSlot[] = [];
let config: EngineConfig;
let processingTimer: ReturnType<typeof setInterval> | null = null;
let zombieTimer: ReturnType<typeof setInterval> | null = null;

// Event emitter pattern for slot:free
type SlotListener = () => void;
const slotListeners: SlotListener[] = [];

function onSlotFree(fn: SlotListener): void {
  slotListeners.push(fn);
}

function emitSlotFree(): void {
  for (const fn of slotListeners) {
    try { fn(); } catch { /* listener error */ }
  }
}

export function initPool(cfg: EngineConfig): void {
  config = cfg;

  // Initialize dependent modules
  initContextBuilder(cfg);
  initWorkspaceManager(cfg);
  initCompletionHandler(cfg);
  initAuthorityEnforcer(cfg);

  const cpuCount = navigator?.hardwareConcurrency ?? 4;
  const maxSlots = Math.min(cpuCount, config.pool.max_concurrent);

  slots = Array.from({ length: maxSlots }, (_, i) => ({
    id: i,
    jobId: null,
    pid: null,
    squadId: null,
    agentId: null,
    startedAt: null,
    status: 'idle' as const,
  }));

  log.info('Process pool initialized', { slots: maxSlots, cpuCores: cpuCount });

  // Event-driven: when a slot frees, process next job
  onSlotFree(() => {
    processQueue();
  });

  // Fallback polling (catches edge cases where event is missed)
  processingTimer = setInterval(() => processQueue(), 2000);

  // Zombie detection every 30s
  zombieTimer = setInterval(() => detectZombies(), 30_000);
}

export function getPoolStatus(): PoolStatus {
  return {
    total: slots.length,
    occupied: slots.filter(s => s.status !== 'idle').length,
    idle: slots.filter(s => s.status === 'idle').length,
    queue_depth: queue.getQueueDepth(),
    slots: slots.map(s => ({ ...s })),
  };
}

function getFreeSlot(): PoolSlot | null {
  return slots.find(s => s.status === 'idle') ?? null;
}

function canRunForSquad(squadId: string): boolean {
  const running = slots.filter(s => s.squadId === squadId && s.status === 'running').length;
  return running < config.pool.max_per_squad;
}

function getRunningSlotsByPriority(): PoolSlot[] {
  return slots
    .filter(s => s.status === 'running' && s.jobId)
    .sort((a, b) => {
      // Get jobs to compare priority — higher number = lower priority
      const jobA = a.jobId ? queue.getJob(a.jobId) : null;
      const jobB = b.jobId ? queue.getJob(b.jobId) : null;
      return (jobB?.priority ?? 0) - (jobA?.priority ?? 0);
    });
}

export function processQueue(): void {
  const slot = getFreeSlot();
  if (!slot) {
    // Check if preemption is needed for P0 jobs
    tryPreemption();
    return;
  }

  const job = queue.dequeue();
  if (!job) return;

  if (!canRunForSquad(job.squad_id)) {
    // Re-queue and try next — but avoid infinite loop
    // We leave the job in pending, it will be picked up on next cycle
    return;
  }

  // Authority check before spawn
  const operation = detectOperation(job);
  const authCheck = canExecute(job.agent_id, operation, job.squad_id);

  if (!authCheck.allowed) {
    queue.updateStatus(job.id, 'rejected', {
      error_message: `Authority blocked: ${authCheck.reason}${authCheck.suggestAgent ? `. Use @${authCheck.suggestAgent} instead.` : ''}`,
    });
    broadcast('job:failed', {
      jobId: job.id,
      error: authCheck.reason,
      suggestAgent: authCheck.suggestAgent,
    });
    // Try to process next job immediately
    processQueue();
    return;
  }

  spawnJob(slot, job);
}

// -- Preemption (P0 only, configurable) --

function tryPreemption(): void {
  const preemptionEnabled = (config as unknown as { pool?: { preemption_enabled?: boolean } }).pool?.preemption_enabled === true;
  if (!preemptionEnabled) return;

  // Check if there's a P0 job waiting
  const pendingP0 = queue.dequeue();
  if (!pendingP0 || pendingP0.priority !== 0) return;

  // Find lowest-priority running job to preempt
  const running = getRunningSlotsByPriority();
  const victim = running[0]; // Highest priority number = lowest priority

  if (!victim?.jobId) return;

  const victimJob = queue.getJob(victim.jobId);
  if (!victimJob || victimJob.priority <= pendingP0.priority) return;

  log.warn('Preempting low-priority job for P0', {
    preemptedJobId: victim.jobId,
    preemptedPriority: victimJob.priority,
    urgentJobId: pendingP0.id,
  });

  // Kill the preempted process
  if (victim.pid) {
    try { process.kill(victim.pid, 'SIGTERM'); } catch { /* dead */ }
  }

  // Re-queue the preempted job
  try {
    queue.updateStatus(victim.jobId, 'failed', {
      error_message: 'Preempted by P0 urgent job',
    });
    queue.updateStatus(victim.jobId, 'pending');
  } catch {
    // May fail if already in terminal state
  }

  // The slot will be freed in the spawnJob finally block,
  // which will trigger emitSlotFree → processQueue
}

// -- Zombie Detection --

function detectZombies(): void {
  let cleaned = 0;

  for (const slot of slots) {
    if (slot.status !== 'running' || !slot.pid) continue;

    // Check if PID still exists
    try {
      process.kill(slot.pid, 0); // Signal 0 = just check existence
    } catch {
      // Process is dead — slot is zombie
      log.warn('Zombie process detected, cleaning slot', {
        slotId: slot.id,
        jobId: slot.jobId,
        pid: slot.pid,
      });

      // Mark job as failed
      if (slot.jobId) {
        try {
          queue.updateStatus(slot.jobId, 'failed', {
            error_message: 'Process died unexpectedly (zombie detected)',
          });
        } catch { /* may already be terminal */ }
      }

      // Free slot
      freeSlot(slot);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log.info('Zombie cleanup completed', { cleaned });
    broadcast('pool:updated', getPoolStatus() as unknown as Record<string, unknown>);
  }
}

function freeSlot(slot: PoolSlot): void {
  slot.status = 'idle';
  slot.jobId = null;
  slot.pid = null;
  slot.squadId = null;
  slot.agentId = null;
  slot.startedAt = null;
}

// -- Operation Detection --

function detectOperation(job: Job): string {
  try {
    const payload = JSON.parse(job.input_payload);
    // Check for explicit command
    if (payload.command) return payload.command;
    // Check for operation type
    if (payload.tipo) return payload.tipo;
    // Default to generic execution
    return 'execute';
  } catch {
    return 'execute';
  }
}

// -- Job Spawning --

async function spawnJob(slot: PoolSlot, job: Job): Promise<void> {
  slot.status = 'spawning';
  slot.jobId = job.id;
  slot.squadId = job.squad_id;
  slot.agentId = job.agent_id;

  let workspace: WorkspaceInfo | undefined;

  try {
    // Phase 1: Transition to running
    queue.updateStatus(job.id, 'running');

    // Phase 2: Build context (agent persona + memories + input)
    const context = await buildContext(job);
    queue.updateFields(job.id, { context_hash: context.hash });

    // Phase 3: Create workspace
    try {
      workspace = await createWorkspace(job);
      queue.updateFields(job.id, { workspace_dir: workspace.path });
    } catch (err) {
      log.warn('Workspace creation failed, using cwd', {
        jobId: job.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Phase 4: Build CLI args
    const args: string[] = ['claude'];
    args.push('-p', context.prompt);
    args.push('--output-format', config.claude.output_format);
    // --verbose is required when using --output-format stream-json with -p
    args.push('--verbose');

    if (config.claude.max_turns > 0) {
      args.push('--max-turns', String(config.claude.max_turns));
    }
    if (config.claude.skip_permissions) {
      args.push('--dangerously-skip-permissions');
    }

    const cwd = workspace?.path || job.workspace_dir || process.cwd();

    log.info('Spawning claude CLI', {
      jobId: job.id,
      agent: job.agent_id,
      squad: job.squad_id,
      slot: slot.id,
      cwd,
      contextHash: context.hash,
      memoriesUsed: context.memoriesUsed,
      hasPersona: !!context.agentMeta,
    });

    // Phase 5: Spawn process
    // Remove CLAUDECODE env var to allow spawning claude CLI from within a Claude session
    const spawnEnv = { ...process.env };
    delete spawnEnv.CLAUDECODE;

    const proc = Bun.spawn(args, {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env: spawnEnv,
    });

    slot.pid = proc.pid;
    slot.status = 'running';
    slot.startedAt = Date.now();

    queue.updateFields(job.id, { pid: proc.pid });

    broadcast('job:started', {
      jobId: job.id,
      squadId: job.squad_id,
      agentId: job.agent_id,
      pid: proc.pid,
      slot: slot.id,
      contextHash: context.hash,
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      try {
        proc.kill('SIGTERM');
        setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch { /* dead */ }
        }, 5000);
      } catch { /* dead */ }
    }, job.timeout_ms);

    // Wait for completion
    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const durationMs = Date.now() - (slot.startedAt ?? Date.now());

    log.info('Process completed', {
      jobId: job.id,
      exitCode,
      durationMs,
      stdoutLen: stdout.length,
      stderrLen: stderr.length,
    });

    // Phase 6: Update job status
    const updatedJob = queue.getJob(job.id);
    if (updatedJob && updatedJob.status === 'running') {
      if (exitCode === 0) {
        queue.updateStatus(job.id, 'done', { output_result: stdout });
      } else {
        queue.updateStatus(job.id, 'failed', {
          error_message: stderr || `Exit code: ${exitCode}`,
        });

        // Auto-retry
        const canRetry = updatedJob.attempts < updatedJob.max_attempts;
        if (canRetry) {
          queue.updateStatus(job.id, 'pending');
          log.info('Job auto-retried', { jobId: job.id, attempt: updatedJob.attempts });
        }
      }
    }

    // Phase 7: Completion handler (memories, metrics, callbacks, cleanup)
    await handleCompletion({
      job: updatedJob ?? job,
      exitCode,
      stdout,
      stderr,
      durationMs,
      workspace,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Spawn failed', { jobId: job.id, error: msg });
    try {
      queue.updateStatus(job.id, 'failed', { error_message: msg });
    } catch { /* may already be in terminal state */ }
    broadcast('job:failed', { jobId: job.id, error: msg });
  } finally {
    // Free slot and emit event
    freeSlot(slot);
    broadcast('pool:updated', getPoolStatus() as unknown as Record<string, unknown>);

    // Event-driven: trigger next job processing
    emitSlotFree();
  }
}

export function killJob(jobId: string): boolean {
  const slot = slots.find(s => s.jobId === jobId);
  if (!slot || !slot.pid) return false;
  try {
    process.kill(slot.pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

export function stopPool(): void {
  if (processingTimer) {
    clearInterval(processingTimer);
    processingTimer = null;
  }

  if (zombieTimer) {
    clearInterval(zombieTimer);
    zombieTimer = null;
  }

  for (const slot of slots) {
    if (slot.pid) {
      try { process.kill(slot.pid, 'SIGTERM'); } catch { /* ok */ }
    }
  }

  slotListeners.length = 0;
  log.info('Process pool stopped');
}
