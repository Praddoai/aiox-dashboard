import { Hono } from 'hono';
import * as queue from '../core/job-queue';
import type { JobStatus } from '../types';

const jobs = new Hono();

// POST /jobs — register external execution (e.g. Claude Code bridge)
// Fork addition (2026-04-22): allows Claude Code hooks to register jobs
// that ran outside the engine, so the dashboard can observe them.
jobs.post('/', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.squad_id || !body.agent_id) {
      return c.json({ error: 'squad_id and agent_id are required' }, 400);
    }

    const job = queue.enqueue({
      squad_id: body.squad_id,
      agent_id: body.agent_id,
      input_payload: body.input_payload ?? {},
      trigger_type: body.trigger_type ?? 'external-claude-code',
      metadata: body.metadata,
      priority: body.priority ?? 2,
    });

    // External jobs are already running in another process (Claude Code).
    // Transition directly pending → running so dashboard sees them live.
    queue.updateStatus(job.id, 'running', {
      pid: body.pid ?? null,
      workspace_dir: body.workspace_dir ?? null,
    });

    const fresh = queue.getJob(job.id);
    return c.json(fresh, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 400);
  }
});

// PATCH /jobs/:id — update external job (progress, status, output)
// Fork addition (2026-04-22): partner of POST /jobs for external sources.
jobs.patch('/:id', async (c) => {
  try {
    const body = await c.req.json();
    const jobId = c.req.param('id');

    // Update optional fields first (doesn't change status)
    const fieldsToUpdate: Record<string, unknown> = {};
    if (body.output_result !== undefined) fieldsToUpdate.output_result = body.output_result;
    if (body.error_message !== undefined) fieldsToUpdate.error_message = body.error_message;
    if (body.pid !== undefined) fieldsToUpdate.pid = body.pid;
    if (body.workspace_dir !== undefined) fieldsToUpdate.workspace_dir = body.workspace_dir;
    if (body.context_hash !== undefined) fieldsToUpdate.context_hash = body.context_hash;
    if (Object.keys(fieldsToUpdate).length > 0) {
      queue.updateFields(jobId, fieldsToUpdate as never);
    }

    // Then transition status if requested
    if (body.status) {
      queue.updateStatus(jobId, body.status as JobStatus, fieldsToUpdate as never);
    }

    const fresh = queue.getJob(jobId);
    if (!fresh) return c.json({ error: 'Job not found' }, 404);
    return c.json(fresh);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 400);
  }
});

// GET /jobs
jobs.get('/', (c) => {
  const status = c.req.query('status') as JobStatus | undefined;
  const squad_id = c.req.query('squad_id');
  const agent_id = c.req.query('agent_id');
  const limit = parseInt(c.req.query('limit') ?? '50', 10);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  const result = queue.listJobs({ status, squad_id, agent_id, limit, offset });
  return c.json(result);
});

// GET /jobs/queue
jobs.get('/queue', (c) => {
  return c.json({
    pending: queue.getQueueDepth(),
    running: queue.getRunningCount(),
  });
});

// GET /jobs/:id/logs
jobs.get('/:id/logs', (c) => {
  const job = queue.getJob(c.req.param('id'));
  if (!job) return c.json({ error: 'Job not found' }, 404);

  const tail = parseInt(c.req.query('tail') ?? '100', 10);
  const logs: string[] = [];

  // Add job lifecycle events as log lines
  logs.push(`[${job.created_at}] Job created: ${job.squad_id}/${job.agent_id}`);
  if (job.started_at) logs.push(`[${job.started_at}] Job started (PID: ${job.pid ?? 'N/A'})`);
  if (job.output_result) {
    // Split output into lines
    const outputLines = job.output_result.split('\n').filter(Boolean);
    logs.push(...outputLines.map((l: string) => `[output] ${l}`));
  }
  if (job.error_message) logs.push(`[error] ${job.error_message}`);
  if (job.completed_at) logs.push(`[${job.completed_at}] Job ${job.status}`);

  const sliced = logs.slice(-tail);
  return c.json({ logs: sliced, total: logs.length, hasMore: logs.length > tail });
});

// GET /jobs/:id
jobs.get('/:id', (c) => {
  const job = queue.getJob(c.req.param('id'));
  if (!job) return c.json({ error: 'Job not found' }, 404);
  return c.json(job);
});

// POST /jobs/:id/retry
jobs.post('/:id/retry', (c) => {
  try {
    const job = queue.retryJob(c.req.param('id'));
    return c.json(job);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 400);
  }
});

// DELETE /jobs/:id
jobs.delete('/:id', (c) => {
  try {
    queue.cancelJob(c.req.param('id'));
    return c.json({ status: 'cancelled' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 400);
  }
});

export { jobs };
