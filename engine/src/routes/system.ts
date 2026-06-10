import { Hono } from 'hono';
import { getPoolStatus } from '../core/process-pool';
import { getAuditLog, canExecute, reloadRules } from '../core/authority-enforcer';
import { getAvailableBundles, getActiveBundle, setActiveBundle, validateAgentForBundle } from '../core/team-bundle';
import { getWSClientCount } from '../lib/ws';

const startedAt = Date.now();

const system = new Hono();

// GET /health
system.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.4.0',
    uptime_ms: Date.now() - startedAt,
    pid: process.pid,
    ws_clients: getWSClientCount(),
  });
});

// GET /pool
system.get('/pool', (c) => {
  return c.json(getPoolStatus());
});

// POST /pool/resize
system.post('/pool/resize', async (c) => {
  const body = await c.req.json<{ size: number }>();
  if (!body.size || body.size < 1 || body.size > 20) {
    return c.json({ error: 'size must be between 1 and 20' }, 400);
  }
  // Pool resize requires engine restart — return current status with advisory
  const status = getPoolStatus();
  return c.json({
    ...status,
    message: `Pool resize to ${body.size} acknowledged. Effective on next engine restart.`,
    requestedSize: body.size,
  });
});

// GET /authority/audit — View authority audit log
system.get('/authority/audit', (c) => {
  const limit = Number(c.req.query('limit') || '50');
  return c.json({ entries: getAuditLog(limit) });
});

// POST /authority/check — Check if agent can execute operation
system.post('/authority/check', async (c) => {
  const body = await c.req.json<{
    agentId: string;
    operation: string;
    squadId: string;
  }>();

  if (!body.agentId || !body.operation || !body.squadId) {
    return c.json({ error: 'agentId, operation, and squadId required' }, 400);
  }

  const result = canExecute(body.agentId, body.operation, body.squadId);
  return c.json(result);
});

// POST /authority/reload — Reload authority rules from disk
system.post('/authority/reload', (c) => {
  reloadRules();
  return c.json({ status: 'reloaded' });
});

// ============================================================
// Team Bundles — Story 3.5
// ============================================================

// GET /bundles — List available team bundles
system.get('/bundles', (c) => {
  return c.json({
    bundles: getAvailableBundles(),
    active: getActiveBundle()?.id ?? null,
  });
});

// POST /bundles/activate — Set active bundle
system.post('/bundles/activate', async (c) => {
  const body = await c.req.json<{ bundleId: string | null }>();
  try {
    setActiveBundle(body.bundleId);
    return c.json({ active: body.bundleId, status: 'ok' });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

// POST /bundles/validate — Check if agent belongs to bundle
system.post('/bundles/validate', async (c) => {
  const body = await c.req.json<{ agentId: string; bundleId?: string }>();
  const result = validateAgentForBundle(body.agentId, body.bundleId);
  return c.json(result);
});

export { system };
