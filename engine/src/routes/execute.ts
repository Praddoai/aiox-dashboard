import { Hono } from 'hono';
import { ulid } from 'ulid';
import * as queue from '../core/job-queue';
import {
  startWorkflow,
  getWorkflowState,
  listWorkflows,
  pauseWorkflow,
  resumeWorkflow,
  getAvailableWorkflows,
} from '../core/workflow-engine';
import { getDb } from '../lib/db';
import type { ExecuteRequest, ExecuteResponse, WorkflowStatus } from '../types';

const execute = new Hono();

// POST /execute/agent
execute.post('/agent', async (c) => {
  const body = await c.req.json<ExecuteRequest>();

  if (!body.squadId || !body.agentId || !body.input?.message) {
    return c.json({ error: 'Missing required fields: squadId, agentId, input.message' }, 400);
  }

  const job = queue.enqueue({
    squad_id: body.squadId,
    agent_id: body.agentId,
    input_payload: {
      message: body.input.message,
      context: body.input.context,
      command: body.input.command,
    },
    trigger_type: 'gui',
    timeout_ms: body.options?.timeout,
  });

  const response: ExecuteResponse = {
    executionId: job.id,
    status: 'queued',
  };

  return c.json(response, 201);
});

// GET /execute/status/:executionId
execute.get('/status/:executionId', (c) => {
  const job = queue.getJob(c.req.param('executionId'));
  if (!job) return c.json({ error: 'Execution not found' }, 404);

  const statusMap: Record<string, ExecuteResponse['status']> = {
    pending: 'queued',
    running: 'running',
    done: 'completed',
    failed: 'failed',
    timeout: 'failed',
    rejected: 'failed',
    cancelled: 'failed',
  };

  const response: ExecuteResponse = {
    executionId: job.id,
    status: statusMap[job.status] ?? 'failed',
    result: job.output_result ?? undefined,
    error: job.error_message ?? undefined,
    duration_ms: job.started_at && job.completed_at
      ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
      : undefined,
  };

  return c.json(response);
});

// DELETE /execute/status/:executionId
execute.delete('/status/:executionId', (c) => {
  try {
    queue.cancelJob(c.req.param('executionId'));
    return c.json({ executionId: c.req.param('executionId'), status: 'cancelled' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 400);
  }
});

// GET /execute/history
execute.get('/history', (c) => {
  const limit = parseInt(c.req.query('limit') ?? '50', 10);
  const status = c.req.query('status');
  const agentId = c.req.query('agentId');
  const squadId = c.req.query('squadId');

  const result = queue.listJobs({
    status: status as never,
    squad_id: squadId,
    agent_id: agentId,
    limit,
  });

  return c.json({
    total: result.total,
    executions: result.jobs.map(j => ({
      id: j.id,
      squadId: j.squad_id,
      agentId: j.agent_id,
      status: j.status,
      duration_ms: j.started_at && j.completed_at
        ? new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()
        : null,
      createdAt: j.created_at,
      completedAt: j.completed_at,
    })),
  });
});

// GET /execute/stats
execute.get('/stats', (c) => {
  const db = getDb();
  const since = c.req.query('since') ?? '1970-01-01';

  const stats = db.query<{
    total: number;
    completed: number;
    failed: number;
    avg_duration: number;
  }, [string]>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status IN ('failed', 'timeout') THEN 1 ELSE 0 END) as failed,
      AVG(CASE
        WHEN started_at IS NOT NULL AND completed_at IS NOT NULL
        THEN (julianday(completed_at) - julianday(started_at)) * 86400000
        ELSE NULL
      END) as avg_duration
    FROM jobs
    WHERE created_at >= ?
  `).get(since);

  return c.json({
    total: stats?.total ?? 0,
    completed: stats?.completed ?? 0,
    failed: stats?.failed ?? 0,
    successRate: stats?.total ? ((stats.completed ?? 0) / stats.total * 100).toFixed(1) : '0',
    avgDurationMs: Math.round(stats?.avg_duration ?? 0),
    pending: queue.getQueueDepth(),
    running: queue.getRunningCount(),
  });
});

// GET /execute/llm/health — stub for frontend compatibility
execute.get('/llm/health', (c) => {
  return c.json({ status: 'ok', provider: 'claude-cli', model: 'claude-max' });
});

// GET /execute/llm/models — stub
execute.get('/llm/models', (c) => {
  return c.json({ models: [{ id: 'claude-max', name: 'Claude Max (CLI)', available: true }] });
});

// GET /execute/llm/usage — Token usage statistics
// Returns LLMUsage format: { claude, openai, total } with { input, output, requests } each
execute.get('/llm/usage', (c) => {
  const db = getDb();
  const since = c.req.query('since') ?? '1970-01-01';

  const stats = db.query<{
    total_executions: number;
  }, [string]>(`
    SELECT COUNT(*) as total_executions
    FROM jobs WHERE created_at >= ?
  `).get(since);

  const totalRequests = stats?.total_executions ?? 0;

  return c.json({
    claude: {
      input: 0,
      output: 0,
      requests: totalRequests,
    },
    openai: {
      input: 0,
      output: 0,
      requests: 0,
    },
    total: {
      input: 0,
      output: 0,
      requests: totalRequests,
    },
  });
});

// GET /execute/db/health
execute.get('/db/health', (c) => {
  try {
    const db = getDb();
    db.query('SELECT 1').get();
    return c.json({ connected: true });
  } catch (err) {
    return c.json({ connected: false, error: String(err) });
  }
});

// ============================================================
// Workflow Orchestration — Story 3.3
// ============================================================

// POST /execute/orchestrate — Start a workflow
execute.post('/orchestrate', async (c) => {
  const body = await c.req.json<{
    workflowId: string;
    input: Record<string, unknown>;
    bundle?: string;
    parentJobId?: string;
  }>();

  if (!body.workflowId) {
    return c.json({ error: 'workflowId required' }, 400);
  }

  try {
    const state = startWorkflow(body.workflowId, body.input ?? {}, body.parentJobId);
    return c.json({
      workflowId: state.workflow_id,
      definitionId: state.definition_id,
      status: state.status,
      currentPhase: state.current_phase,
    }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 400);
  }
});

// GET /execute/orchestrate/active — List active (running) workflows
execute.get('/orchestrate/active', (c) => {
  const running = listWorkflows('running' as WorkflowStatus, 100);
  const paused = listWorkflows('paused' as WorkflowStatus, 100);
  const workflows = [...running, ...paused].map(w => ({
    id: w.id,
    workflowId: w.workflow_id,
    definitionId: w.definition_id,
    currentPhase: w.current_phase,
    status: w.status,
    iterationCount: w.iteration_count,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }));
  return c.json({ workflows });
});

// GET /execute/orchestrate/:workflowId — Get workflow state
execute.get('/orchestrate/:workflowId', (c) => {
  const state = getWorkflowState(c.req.param('workflowId'));
  if (!state) return c.json({ error: 'Workflow not found' }, 404);

  return c.json({
    id: state.id,
    workflowId: state.workflow_id,
    definitionId: state.definition_id,
    currentPhase: state.current_phase,
    status: state.status,
    phaseHistory: JSON.parse(state.phase_history),
    iterationCount: state.iteration_count,
    createdAt: state.created_at,
    updatedAt: state.updated_at,
  });
});

// GET /execute/orchestrate — List workflows
execute.get('/orchestrate', (c) => {
  const status = c.req.query('status') as WorkflowStatus | undefined;
  const limit = Number(c.req.query('limit') || '20');
  const workflows = listWorkflows(status, limit);

  return c.json({
    workflows: workflows.map(w => ({
      id: w.id,
      workflowId: w.workflow_id,
      definitionId: w.definition_id,
      currentPhase: w.current_phase,
      status: w.status,
      iterationCount: w.iteration_count,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    })),
  });
});

// POST /execute/orchestrate/:workflowId/pause — Pause workflow
execute.post('/orchestrate/:workflowId/pause', (c) => {
  try {
    pauseWorkflow(c.req.param('workflowId'));
    return c.json({ status: 'paused' });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

// POST /execute/orchestrate/:workflowId/resume — Resume workflow
execute.post('/orchestrate/:workflowId/resume', (c) => {
  try {
    resumeWorkflow(c.req.param('workflowId'));
    return c.json({ status: 'resumed' });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

// GET /execute/workflows — List available workflow definitions
execute.get('/workflows', (c) => {
  return c.json({ workflows: getAvailableWorkflows() });
});

// POST /execute/track — track external execution
execute.post('/track', async (c) => {
  const body = await c.req.json();
  const id = ulid();

  const db = getDb();
  db.run(
    `INSERT INTO executions (id, job_id, squad_id, agent_id, duration_ms, success, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, body.executionId ?? id, body.squadId, body.agentId, body.duration ?? null, body.success ? 1 : 0]
  );

  return c.json({ tracked: true, executionId: id });
});

// POST /execute/track/batch — batch track executions
execute.post('/track/batch', async (c) => {
  const body = await c.req.json<{ executions: Array<{
    executionId?: string;
    squadId: string;
    agentId: string;
    duration?: number;
    success: boolean;
  }> }>();

  if (!body.executions || !Array.isArray(body.executions)) {
    return c.json({ error: 'executions array required' }, 400);
  }

  const db = getDb();
  const results: Array<{ executionId: string; tracked: boolean }> = [];

  for (const exec of body.executions) {
    const id = ulid();
    try {
      db.run(
        `INSERT INTO executions (id, job_id, squad_id, agent_id, duration_ms, success, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [id, exec.executionId ?? id, exec.squadId, exec.agentId, exec.duration ?? null, exec.success ? 1 : 0]
      );
      results.push({ executionId: id, tracked: true });
    } catch {
      results.push({ executionId: id, tracked: false });
    }
  }

  return c.json({ tracked: results.length, results });
});

export { execute };
