import { Hono } from 'hono';
import * as queue from '../core/job-queue';
import { log } from '../lib/logger';
import type { EngineConfig } from '../types';

// ============================================================
// Webhook Triggers — Story 4.1
// Rate limiting, orchestrator routing, squad→agent mapping
// ============================================================

// Squad → default agent mapping
const SQUAD_DEFAULT_AGENT: Record<string, string> = {
  'aios-core-dev': 'dev',
  'full-stack-dev': 'dev',
  'development': 'dev',
  'engineering': 'architect',
  'design-system': 'ux-design-expert',
  'design': 'ux-design-expert',
  'data-analytics': 'analyst',
  'analytics': 'analyst',
  'copywriting': 'copywriter',
  'content': 'copywriter',
  'orchestrator': 'aios-orchestrator',
  'advisory': 'analyst',
  'marketing': 'copywriter',
  'creator': 'content-creator',
};

// Orchestrator keyword → squad routing
// Short keywords (<=3 chars) use word boundary matching to avoid false positives
const ROUTING_RULES: Array<{ keywords: string[]; squadId: string; agentId: string }> = [
  { keywords: ['relatorio', 'report', 'analise', 'analysis', 'metricas', 'kpi'], squadId: 'data-analytics', agentId: 'analyst' },
  { keywords: ['copy', 'texto', 'artigo', 'blog', 'conteudo', 'content'], squadId: 'copywriting', agentId: 'copywriter' },
  { keywords: ['design', 'componente', 'layout', 'tela', 'screen', 'interface'], squadId: 'design-system', agentId: 'ux-design-expert' },
  { keywords: ['deploy', 'pipeline', 'release', 'ci/cd', 'devops'], squadId: 'engineering', agentId: 'devops' },
  { keywords: ['teste', 'test', 'bug', 'quality', 'review'], squadId: 'development', agentId: 'qa' },
  { keywords: ['arquitetura', 'architecture', 'schema', 'database', 'migration'], squadId: 'engineering', agentId: 'architect' },
  { keywords: ['story', 'historia', 'epic', 'backlog', 'sprint'], squadId: 'orchestrator', agentId: 'sm' },
  { keywords: ['validar', 'validate', 'priorizar', 'prioritize'], squadId: 'orchestrator', agentId: 'po' },
  { keywords: ['requisito', 'requirement', 'spec', 'prd'], squadId: 'orchestrator', agentId: 'pm' },
];

// -- Rate Limiter (sliding window, in-memory) --

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minute
const RATE_LIMIT_MAX = 10;            // max requests per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    return false; // Rate limited
  }

  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return true;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60_000);

// Strip accents and lowercase for keyword matching
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Match keyword with word boundary for short keywords to avoid false positives
// e.g., "ui" should not match "arquitetura", "ci" should not match "conhecidas"
function matchKeyword(text: string, keyword: string): boolean {
  if (keyword.length <= 3) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    return regex.test(text);
  }
  return text.includes(keyword);
}

// -- Route builder --

export function createWebhookRoutes(config: EngineConfig): Hono {
  const webhooks = new Hono();

  // Auth middleware
  webhooks.use('/*', async (c, next) => {
    const token = config.auth.webhook_token;
    if (!token) return next(); // No auth configured

    const auth = c.req.header('Authorization');
    if (!auth || auth !== `Bearer ${token}`) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return next();
  });

  // Rate limit middleware
  webhooks.use('/*', async (c, next) => {
    const ip = c.req.header('x-forwarded-for')
      ?? c.req.header('x-real-ip')
      ?? 'unknown';

    if (!checkRateLimit(ip)) {
      log.warn('Rate limit exceeded', { ip });
      return c.json({
        error: 'Rate limit exceeded',
        retry_after_ms: RATE_LIMIT_WINDOW_MS,
        limit: RATE_LIMIT_MAX,
      }, 429);
    }

    return next();
  });

  // POST /webhook/orchestrator — intelligent routing
  webhooks.post('/orchestrator', async (c) => {
    const body = await c.req.json();
    const message = normalizeText(String(body.message ?? body.conteudo ?? JSON.stringify(body)));

    // Find matching route (word boundary for short keywords)
    let squadId = 'development';
    let agentId = 'dev';

    for (const rule of ROUTING_RULES) {
      if (rule.keywords.some(kw => matchKeyword(message, kw))) {
        squadId = rule.squadId;
        agentId = rule.agentId;
        break;
      }
    }

    // Override if explicit agentId provided
    if (body.agentId) {
      agentId = body.agentId;
    }

    const job = queue.enqueue({
      squad_id: squadId,
      agent_id: agentId,
      input_payload: {
        message: body.message ?? body.conteudo ?? JSON.stringify(body),
        routed_by: 'orchestrator',
        original_payload: body,
      },
      trigger_type: 'webhook',
      callback_url: body.callback_url,
      priority: body.priority ?? 2,
    });

    log.info('Webhook orchestrator routed', {
      jobId: job.id,
      routedTo: `${squadId}/${agentId}`,
      message: message.slice(0, 100),
    });

    return c.json({
      job_id: job.id,
      status: 'queued',
      routed_to: { squad: squadId, agent: agentId },
    }, 202);
  });

  // POST /webhook/:squadId
  webhooks.post('/:squadId', async (c) => {
    const squadId = c.req.param('squadId');
    const body = await c.req.json();

    // Resolve agent: explicit > squad default > 'dev'
    const agentId = body.agentId
      ?? SQUAD_DEFAULT_AGENT[squadId]
      ?? 'dev';

    const job = queue.enqueue({
      squad_id: squadId,
      agent_id: agentId,
      input_payload: {
        message: body.message ?? body.conteudo ?? JSON.stringify(body),
        tipo: body.tipo,
        referencia: body.referencia,
        raw: body,
      },
      trigger_type: 'webhook',
      callback_url: body.callback_url,
      priority: body.priority ?? 2,
    });

    log.info('Webhook triggered', {
      jobId: job.id,
      squad: squadId,
      agent: agentId,
    });

    return c.json({
      job_id: job.id,
      status: 'queued',
      squad_id: squadId,
      agent_id: agentId,
    }, 202);
  });

  return webhooks;
}
