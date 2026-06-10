import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

// ============================================================
// AIOS Engine — Integration Tests
// Tests the full API surface with a live server
// ============================================================

const BASE = 'http://localhost:4002';
let serverProc: ReturnType<typeof Bun.spawn> | null = null;

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers as Record<string, string> },
    ...options,
  });
  const body = await res.json();
  return { status: res.status, body };
}

beforeAll(async () => {
  // Start engine server
  serverProc = Bun.spawn(['bun', 'run', 'src/index.ts'], {
    cwd: import.meta.dir + '/..',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env },
  });

  // Wait for server to be ready
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) break;
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
});

afterAll(() => {
  if (serverProc) {
    serverProc.kill('SIGTERM');
  }
});

// ============================================================
// 1. System Endpoints
// ============================================================

describe('System', () => {
  test('GET /health returns status ok', async () => {
    const { status, body } = await api('/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.4.0');
    expect(body.pid).toBeGreaterThan(0);
  });

  test('GET /pool returns pool status', async () => {
    const { status, body } = await api('/pool');
    expect(status).toBe(200);
    expect(body.total).toBeGreaterThan(0);
    expect(body.idle + body.occupied).toBe(body.total);
    expect(body.slots).toBeInstanceOf(Array);
    expect(body.slots.length).toBe(body.total);
  });
});

// ============================================================
// 2. Authority Enforcer
// ============================================================

describe('Authority', () => {
  test('blocks dev from git push', async () => {
    const { status, body } = await api('/authority/check', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'dev', operation: 'git push', squadId: 'development' }),
    });
    expect(status).toBe(200);
    expect(body.allowed).toBe(false);
    expect(body.suggestAgent).toBe('devops');
  });

  test('allows devops git push', async () => {
    const { body } = await api('/authority/check', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'devops', operation: 'git push', squadId: 'engineering' }),
    });
    expect(body.allowed).toBe(true);
  });

  test('aios-master is superuser', async () => {
    const { body } = await api('/authority/check', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'aios-master', operation: 'anything', squadId: 'any' }),
    });
    expect(body.allowed).toBe(true);
    expect(body.reason).toBe('superuser');
  });

  test('audit log records checks', async () => {
    const { body } = await api('/authority/audit');
    expect(body.entries).toBeInstanceOf(Array);
    expect(body.entries.length).toBeGreaterThan(0);
    expect(body.entries[0]).toHaveProperty('timestamp');
    expect(body.entries[0]).toHaveProperty('agentId');
    expect(body.entries[0]).toHaveProperty('allowed');
  });

  test('reload rules endpoint', async () => {
    const { status, body } = await api('/authority/reload', { method: 'POST' });
    expect(status).toBe(200);
    expect(body.status).toBe('reloaded');
  });
});

// ============================================================
// 3. Team Bundles
// ============================================================

describe('Bundles', () => {
  test('lists available bundles', async () => {
    const { body } = await api('/bundles');
    expect(body.bundles).toBeInstanceOf(Array);
    expect(body.bundles.length).toBeGreaterThanOrEqual(4);

    const names = body.bundles.map((b: Record<string, unknown>) => b.id);
    expect(names).toContain('team-all');
    expect(names).toContain('team-ide-minimal');
  });

  test('validates agent in bundle', async () => {
    const { body: valid } = await api('/bundles/validate', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'dev', bundleId: 'team-ide-minimal' }),
    });
    expect(valid.valid).toBe(true);

    const { body: invalid } = await api('/bundles/validate', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'architect', bundleId: 'team-ide-minimal' }),
    });
    expect(invalid.valid).toBe(false);
  });

  test('team-all accepts any agent (wildcard)', async () => {
    const { body } = await api('/bundles/validate', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'random-agent-xyz', bundleId: 'team-all' }),
    });
    expect(body.valid).toBe(true);
  });
});

// ============================================================
// 4. Job Queue & Execution
// ============================================================

describe('Jobs', () => {
  let jobId: string;

  test('POST /execute/agent creates a queued job', async () => {
    const { status, body } = await api('/execute/agent', {
      method: 'POST',
      body: JSON.stringify({
        squadId: 'development',
        agentId: 'dev',
        input: { message: 'Integration test task' },
      }),
    });
    expect(status).toBe(201);
    expect(body.executionId).toBeTruthy();
    expect(body.status).toBe('queued');
    jobId = body.executionId;
  });

  test('GET /execute/status/:id returns job status', async () => {
    // Wait briefly for pool to attempt processing
    await new Promise(r => setTimeout(r, 2000));

    const { status, body } = await api(`/execute/status/${jobId}`);
    expect(status).toBe(200);
    expect(body.executionId).toBe(jobId);
    // Job will be running or failed (claude -p can't run nested)
    expect(['queued', 'running', 'failed', 'completed']).toContain(body.status);
  });

  test('GET /execute/history lists jobs', async () => {
    const { body } = await api('/execute/history');
    expect(body.total).toBeGreaterThan(0);
    expect(body.executions).toBeInstanceOf(Array);
    expect(body.executions[0]).toHaveProperty('id');
    expect(body.executions[0]).toHaveProperty('squadId');
  });

  test('GET /execute/stats returns statistics', async () => {
    const { body } = await api('/execute/stats');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('completed');
    expect(body).toHaveProperty('failed');
    expect(body).toHaveProperty('successRate');
    expect(body).toHaveProperty('pending');
    expect(body).toHaveProperty('running');
  });

  test('GET /jobs lists all jobs', async () => {
    const { body } = await api('/jobs');
    expect(body).toHaveProperty('jobs');
    expect(body).toHaveProperty('total');
  });

  test('DELETE /execute/status/:id cancels job', async () => {
    // Create a new job to cancel
    const { body: created } = await api('/execute/agent', {
      method: 'POST',
      body: JSON.stringify({
        squadId: 'development',
        agentId: 'dev',
        input: { message: 'Job to cancel' },
      }),
    });

    // Try to cancel — may fail if already processed
    const { body } = await api(`/execute/status/${created.executionId}`, {
      method: 'DELETE',
    });
    // Either cancelled or already in terminal state
    expect(body).toHaveProperty('executionId');
  });
});

// ============================================================
// 5. Workflows
// ============================================================

describe('Workflows', () => {
  test('lists available workflow definitions', async () => {
    const { body } = await api('/execute/workflows');
    expect(body.workflows).toBeInstanceOf(Array);
    expect(body.workflows.length).toBeGreaterThanOrEqual(3);

    const ids = body.workflows.map((w: Record<string, unknown>) => w.id);
    expect(ids).toContain('story-development-cycle');
    expect(ids).toContain('qa-loop');
    expect(ids).toContain('spec-pipeline');
  });

  test('starts a workflow', async () => {
    const { status, body } = await api('/execute/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: 'story-development-cycle',
        input: { storyId: 'TEST-INT-001' },
      }),
    });
    expect(status).toBe(201);
    expect(body.workflowId).toBeTruthy();
    expect(body.definitionId).toBe('story-development-cycle');
    expect(body.currentPhase).toBe('create');
  });

  test('lists active workflows', async () => {
    const { body } = await api('/execute/orchestrate');
    expect(body.workflows).toBeInstanceOf(Array);
    expect(body.workflows.length).toBeGreaterThan(0);
  });

  test('rejects unknown workflow', async () => {
    const { status, body } = await api('/execute/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ workflowId: 'nonexistent-workflow', input: {} }),
    });
    expect(status).toBe(400);
    expect(body.error).toContain('not found');
  });
});

// ============================================================
// 6. Webhook Routing
// ============================================================

describe('Webhooks', () => {
  test('routes analytics message correctly', async () => {
    const { status, body } = await api('/webhook/orchestrator', {
      method: 'POST',
      body: JSON.stringify({ message: 'Gerar relatório de métricas' }),
    });
    // May return 202 (accepted) or 429 (rate limited from pool saturation)
    if (status === 202) {
      expect(body.routed_to.squad).toBe('data-analytics');
      expect(body.routed_to.agent).toBe('analyst');
    } else {
      expect(status).toBe(429);
    }
  });

  test('routes design message correctly', async () => {
    const { status, body } = await api('/webhook/orchestrator', {
      method: 'POST',
      body: JSON.stringify({ message: 'Criar componente de UI' }),
    });
    if (status === 202) {
      expect(body.routed_to.squad).toBe('design-system');
      expect(body.routed_to.agent).toBe('ux-design-expert');
    } else {
      expect(status).toBe(429);
    }
  });

  test('routes deploy message correctly', async () => {
    const { status, body } = await api('/webhook/orchestrator', {
      method: 'POST',
      body: JSON.stringify({ message: 'Deploy do release 3.0' }),
    });
    if (status === 202) {
      expect(body.routed_to.squad).toBe('engineering');
      expect(body.routed_to.agent).toBe('devops');
    } else {
      expect(status).toBe(429);
    }
  });

  test('POST /webhook/:squadId enqueues job', async () => {
    const { status, body } = await api('/webhook/development', {
      method: 'POST',
      body: JSON.stringify({ message: 'Fix login bug', agentId: 'dev' }),
    });
    // May be rate-limited by previous tests filling the queue
    if (status === 202) {
      expect(body.job_id).toBeTruthy();
      expect(body.squad_id).toBe('development');
    } else {
      expect(status).toBe(429);
    }
  });

  test('rate limit triggers after 10 requests', async () => {
    // Exhaust rate limit
    const promises = Array.from({ length: 12 }, () =>
      fetch(`${BASE}/webhook/orchestrator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'rate limit test' }),
      })
    );

    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);
    // At least one should be 429
    expect(statuses).toContain(429);
  });
});

// ============================================================
// 7. Cron Jobs
// ============================================================

describe('Cron', () => {
  let cronId: string;

  test('creates a cron job', async () => {
    const { status, body } = await api('/cron', {
      method: 'POST',
      body: JSON.stringify({
        squadId: 'data-analytics',
        agentId: 'analyst',
        schedule: '0 9 * * *',
        input: { message: 'Daily report' },
        description: 'Test cron',
      }),
    });
    expect(status).toBe(201);
    expect(body.id).toBeTruthy();
    expect(body.schedule).toBe('0 9 * * *');
    expect(body.next_run_at).toBeTruthy();
    cronId = body.id;
  });

  test('lists cron jobs', async () => {
    const { body } = await api('/cron');
    expect(body.crons).toBeInstanceOf(Array);
    expect(body.crons.length).toBeGreaterThan(0);

    const found = body.crons.find((c: Record<string, unknown>) => c.id === cronId);
    expect(found).toBeTruthy();
    expect(found.enabled).toBe(true);
  });

  test('gets single cron job', async () => {
    const { body } = await api(`/cron/${cronId}`);
    expect(body.id).toBe(cronId);
    expect(body.squad_id).toBe('data-analytics');
  });

  test('toggles cron job off', async () => {
    const { body } = await api(`/cron/${cronId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    });
    expect(body.enabled).toBe(false);
  });

  test('rejects invalid schedule', async () => {
    const { status, body } = await api('/cron', {
      method: 'POST',
      body: JSON.stringify({
        squadId: 'dev',
        agentId: 'dev',
        schedule: 'invalid-cron',
      }),
    });
    expect(status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  test('deletes cron job', async () => {
    const { body } = await api(`/cron/${cronId}`, { method: 'DELETE' });
    expect(body.status).toBe('deleted');

    const { status } = await api(`/cron/${cronId}`);
    expect(status).toBe(404);
  });
});

// ============================================================
// 8. Memory
// ============================================================

describe('Memory', () => {
  let _memoryId: string;

  test('stores memory', async () => {
    const { status, body } = await api('/memory/store', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Integration test memory entry',
        scope: 'test',
        type: 'INSIGHT',
        jobId: 'integration-test',
        agentId: 'test-agent',
      }),
    });
    expect(status).toBe(201);
    expect(body.stored).toBe(true);
    expect(body.id).toBeTruthy();
    _memoryId = body.id;
  });

  test('recalls memory by scope', async () => {
    const { body } = await api('/memory/test');
    expect(body.scope).toBe('test');
    expect(body.memories).toBeInstanceOf(Array);
    expect(body.memories.length).toBeGreaterThan(0);
  });

  test('recalls memory by search', async () => {
    const { body } = await api('/memory/recall', {
      method: 'POST',
      body: JSON.stringify({ query: 'integration test', scopes: ['test'] }),
    });
    expect(body.memories).toBeInstanceOf(Array);
  });

  test('deletes memory', async () => {
    // Create fresh memory to delete
    const { body: created } = await api('/memory/store', {
      method: 'POST',
      body: JSON.stringify({ content: 'to delete', scope: 'test-delete' }),
    });
    const { body } = await api(`/memory/${created.id}`, { method: 'DELETE' });
    expect(body.deleted).toBe(true);
  });
});

// ============================================================
// 9. Database Health
// ============================================================

describe('Infrastructure', () => {
  test('database is healthy', async () => {
    const { body } = await api('/execute/db/health');
    expect(body.connected).toBe(true);
  });

  test('LLM health stub works', async () => {
    const { body } = await api('/execute/llm/health');
    expect(body.status).toBe('ok');
    expect(body.provider).toBe('claude-cli');
  });
});

// ============================================================
// 10. WebSocket
// ============================================================

describe('WebSocket', () => {
  test('connects and receives init', async () => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WS timeout')), 5000);

      const ws = new WebSocket('ws://localhost:4002/live');

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Should receive init or room_update
        if (data.type === 'init' || data.type === 'room_update') {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };
    });
  });

  test('responds to ping with pong', async () => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Pong timeout')), 5000);

      const ws = new WebSocket('ws://localhost:4002/live');

      ws.onopen = () => {
        ws.send('ping');
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };
    });
  });
});
