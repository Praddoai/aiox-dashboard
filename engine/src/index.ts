import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { loadConfig } from './lib/config';
import { log, setLogLevel } from './lib/logger';
import { initDb, closeDb } from './lib/db';
import { initPool, stopPool } from './core/process-pool';
import { initWorkflowEngine } from './core/workflow-engine';
import { initTeamBundles } from './core/team-bundle';
import { initCronScheduler, stopAllCrons } from './core/cron-scheduler';
import { checkTimeouts } from './core/job-queue';
import { handleWSOpen, handleWSClose, handleWSMessage, createWSData, initWSHeartbeat, stopWSHeartbeat } from './lib/ws';
import { system } from './routes/system';
import { jobs } from './routes/jobs';
import { execute } from './routes/execute';
import { createWebhookRoutes } from './routes/webhooks';
import { memory } from './routes/memory';
import { cron } from './routes/cron';
import { stream } from './routes/stream';
import { whatsapp } from './routes/whatsapp';
import { registry } from './routes/registry';

// ============================================================
// AIOS Agent Execution Engine — v0.4.0
// ============================================================

import { getProjectPaths } from './lib/config';

const config = loadConfig();
setLogLevel(config.logging.level);

const paths = getProjectPaths();
log.info('Starting AIOS Agent Execution Engine', {
  version: '0.5.0',
  port: config.server.port,
  pool_max: config.pool.max_concurrent,
  project_root: paths.projectRoot,
});

// Initialize database (runs migrations)
initDb();

// Initialize process pool (includes context-builder, workspace-manager, completion-handler, authority-enforcer)
initPool(config);

// Initialize workflow engine (loads workflow definitions from .aios-core)
initWorkflowEngine(config);

// Initialize team bundles
initTeamBundles(config);

// Initialize cron scheduler (restores persisted crons)
initCronScheduler(config);

// Start WebSocket heartbeat (30s ping/pong)
initWSHeartbeat();

// Periodic timeout checker
const timeoutChecker = setInterval(() => {
  const timedOut = checkTimeouts();
  if (timedOut > 0) {
    log.warn('Timed out jobs', { count: timedOut });
  }
}, config.queue.check_interval_ms);

// Build Hono app
const app = new Hono();

// CORS
app.use('/*', cors({
  origin: config.server.cors_origins,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Mount routes
app.route('/', system);
app.route('/jobs', jobs);
app.route('/execute', execute);
app.route('/stream', stream);
app.route('/webhook', createWebhookRoutes(config));
app.route('/memory', memory);
app.route('/cron', cron);
app.route('/whatsapp', whatsapp);
app.route('/registry', registry);

// Serve dashboard static files if configured (AIOS_DASHBOARD_DIR env or ../dist/)
const dashboardDir = process.env.AIOS_DASHBOARD_DIR
  ? resolve(process.env.AIOS_DASHBOARD_DIR)
  : resolve(import.meta.dir, '../../dist');

if (existsSync(dashboardDir)) {
  log.info('Serving dashboard', { path: dashboardDir });
  app.use('/assets/*', serveStatic({ root: dashboardDir }));
  app.use('/favicon.ico', serveStatic({ root: dashboardDir }));
  app.use('/pwa-*', serveStatic({ root: dashboardDir }));
  app.use('/manifest.webmanifest', serveStatic({ root: dashboardDir }));
  // SPA fallback: any non-API HTML request gets index.html
  const indexHtmlPath = resolve(dashboardDir, 'index.html');
  app.get('*', async (c) => {
    if (c.req.header('accept')?.includes('text/html')) {
      const html = await Bun.file(indexHtmlPath).text();
      return c.html(html);
    }
    return c.json({ error: 'Not found' }, 404);
  });
} else {
  log.info('No dashboard dist found, API-only mode', { checked: dashboardDir });
}

// Catch-all 404
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  log.error('Unhandled error', { path: c.req.path, error: err.message });
  return c.json({ error: 'Internal server error' }, 500);
});

// Start server with WebSocket support
const server = Bun.serve({
  port: config.server.port,
  hostname: config.server.host,
  idleTimeout: 255, // ~4 min — SSE streams need long-lived connections (Bun max is 255)
  fetch(req, server) {
    // WebSocket upgrade for /live
    const url = new URL(req.url);
    if (url.pathname === '/live') {
      const upgraded = server.upgrade(req, { data: createWSData() });
      if (upgraded) return; // Bun handles the response
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
    // Delegate to Hono
    return app.fetch(req);
  },
  websocket: {
    open: handleWSOpen,
    close: handleWSClose,
    message: handleWSMessage,
  },
});

log.info(`Engine listening on http://${config.server.host}:${config.server.port}`);
if (existsSync(dashboardDir)) {
  log.info(`Dashboard: http://${config.server.host === '0.0.0.0' ? 'localhost' : config.server.host}:${config.server.port}/`);
}
log.info('Endpoints:', {
  system: '/health, /pool, /authority/*, /bundles',
  jobs: '/jobs',
  execute: '/execute/agent, /execute/orchestrate, /execute/workflows',
  stream: '/stream/agent (SSE)',
  webhook: '/webhook/:squadId, /webhook/orchestrator',
  whatsapp: '/whatsapp/webhook, /whatsapp/events (SSE), /whatsapp/send, /whatsapp/status',
  registry: '/registry/project, /registry/squads, /registry/agents, /registry/workflows, /registry/tasks',
  memory: '/memory/:scope, /memory/recall, /memory/store',
  cron: '/cron (CRUD)',
  ws: 'ws://*/live',
  dashboard: existsSync(dashboardDir) ? '/ (static SPA)' : 'not configured',
});

// Graceful shutdown
function shutdown(): void {
  log.info('Shutting down...');
  clearInterval(timeoutChecker);
  stopWSHeartbeat();
  stopAllCrons();
  stopPool();
  closeDb();
  server.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
