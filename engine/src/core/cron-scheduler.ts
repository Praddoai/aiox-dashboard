import { Cron } from 'croner';
import { ulid } from 'ulid';
import { getDb } from '../lib/db';
import { log } from '../lib/logger';
import { broadcast } from '../lib/ws';
import * as queue from './job-queue';
import type { EngineConfig } from '../types';

// ============================================================
// Cron Scheduler — Story 4.2
// Persistent cron jobs with overlap detection
// ============================================================

let _config: EngineConfig;

interface CronJobDef {
  id: string;
  squad_id: string;
  agent_id: string;
  schedule: string;
  input_payload: string;
  enabled: number;
  last_run_at: string | null;
  last_job_id: string | null;
  next_run_at: string | null;
  created_at: string;
  description: string | null;
}

// Active cron instances
const activeCrons = new Map<string, Cron>();

export function initCronScheduler(cfg: EngineConfig): void {
  _config = cfg;
  restoreCrons();
}

export function createCronJob(input: {
  squadId: string;
  agentId: string;
  schedule: string;
  inputPayload?: Record<string, unknown>;
  description?: string;
}): CronJobDef {
  // Validate cron expression
  try {
    const testCron = new Cron(input.schedule);
    const next = testCron.nextRun();
    testCron.stop();
    if (!next) throw new Error('No next run calculated');
  } catch (err) {
    throw new Error(`Invalid cron schedule "${input.schedule}": ${err instanceof Error ? err.message : String(err)}`);
  }

  const db = getDb();
  const id = ulid();
  const now = new Date().toISOString();
  const payload = JSON.stringify(input.inputPayload ?? {});

  // Calculate next run
  const tempCron = new Cron(input.schedule);
  const nextRun = tempCron.nextRun()?.toISOString() ?? null;
  tempCron.stop();

  db.run(
    `INSERT INTO cron_jobs (id, squad_id, agent_id, schedule, input_payload, enabled,
      next_run_at, created_at, description)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [id, input.squadId, input.agentId, input.schedule, payload,
     nextRun, now, input.description ?? null],
  );

  const def: CronJobDef = {
    id, squad_id: input.squadId, agent_id: input.agentId,
    schedule: input.schedule, input_payload: payload,
    enabled: 1, last_run_at: null, last_job_id: null,
    next_run_at: nextRun, created_at: now,
    description: input.description ?? null,
  };

  // Start the cron
  startCron(def);

  log.info('Cron job created', { id, schedule: input.schedule, squad: input.squadId, agent: input.agentId });
  return def;
}

export function deleteCronJob(id: string): void {
  // Stop active cron
  const cron = activeCrons.get(id);
  if (cron) {
    cron.stop();
    activeCrons.delete(id);
  }

  const db = getDb();
  db.run('DELETE FROM cron_jobs WHERE id = ?', [id]);
  log.info('Cron job deleted', { id });
}

export function listCronJobs(): CronJobDef[] {
  const db = getDb();
  return db.query<CronJobDef, []>('SELECT * FROM cron_jobs ORDER BY created_at DESC').all();
}

export function getCronJob(id: string): CronJobDef | null {
  const db = getDb();
  return db.query<CronJobDef, [string]>('SELECT * FROM cron_jobs WHERE id = ?').get(id) ?? null;
}

export function toggleCronJob(id: string, enabled: boolean): void {
  const db = getDb();
  db.run('UPDATE cron_jobs SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);

  if (enabled) {
    const def = getCronJob(id);
    if (def) startCron(def);
  } else {
    const cron = activeCrons.get(id);
    if (cron) {
      cron.stop();
      activeCrons.delete(id);
    }
  }

  log.info('Cron job toggled', { id, enabled });
}

export function stopAllCrons(): void {
  for (const [_id, cron] of activeCrons) {
    cron.stop();
  }
  activeCrons.clear();
  log.info('All cron jobs stopped');
}

// -- Internal --

function startCron(def: CronJobDef): void {
  // Don't start disabled crons
  if (!def.enabled) return;

  // Stop existing if any
  const existing = activeCrons.get(def.id);
  if (existing) existing.stop();

  const cron = new Cron(def.schedule, () => {
    executeCronJob(def);
  });

  activeCrons.set(def.id, cron);

  // Update next_run_at
  const nextRun = cron.nextRun()?.toISOString() ?? null;
  const db = getDb();
  db.run('UPDATE cron_jobs SET next_run_at = ? WHERE id = ?', [nextRun, def.id]);
}

async function executeCronJob(def: CronJobDef): Promise<void> {
  // Overlap detection: skip if previous job still running
  if (def.last_job_id) {
    const lastJob = queue.getJob(def.last_job_id);
    if (lastJob && (lastJob.status === 'running' || lastJob.status === 'pending')) {
      log.info('Cron skipped (previous still running)', {
        cronId: def.id,
        lastJobId: def.last_job_id,
        lastJobStatus: lastJob.status,
      });
      return;
    }
  }

  // Create job
  const input = JSON.parse(def.input_payload);
  const job = queue.enqueue({
    squad_id: def.squad_id,
    agent_id: def.agent_id,
    input_payload: {
      ...input,
      _cron_id: def.id,
      _cron_schedule: def.schedule,
    },
    trigger_type: 'cron',
    priority: 2,
  });

  // Update cron state
  const db = getDb();
  const now = new Date().toISOString();

  // Get next run from active cron
  const activeCron = activeCrons.get(def.id);
  const nextRun = activeCron?.nextRun()?.toISOString() ?? null;

  db.run(
    'UPDATE cron_jobs SET last_run_at = ?, last_job_id = ?, next_run_at = ? WHERE id = ?',
    [now, job.id, nextRun, def.id],
  );

  // Update local def for overlap detection
  def.last_job_id = job.id;
  def.last_run_at = now;

  log.info('Cron job triggered', {
    cronId: def.id,
    jobId: job.id,
    squad: def.squad_id,
    agent: def.agent_id,
    nextRun,
  });

  broadcast('job:created', {
    jobId: job.id,
    squadId: def.squad_id,
    agentId: def.agent_id,
    trigger: 'cron',
    cronId: def.id,
  });
}

function restoreCrons(): void {
  const db = getDb();
  const defs = db.query<CronJobDef, []>(
    'SELECT * FROM cron_jobs WHERE enabled = 1'
  ).all();

  for (const def of defs) {
    try {
      startCron(def);
    } catch (err) {
      log.warn('Failed to restore cron', {
        id: def.id,
        schedule: def.schedule,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info('Cron jobs restored', { count: defs.length });
}
