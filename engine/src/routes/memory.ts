import { Hono } from 'hono';
import type { SQLQueryBindings } from 'bun:sqlite';
import { getDb } from '../lib/db';
import { recallMemoriesLocal, storeMemoryLocal } from '../core/memory-client';

const memory = new Hono();

// GET /memory/:scope
memory.get('/:scope', (c) => {
  const scope = decodeURIComponent(c.req.param('scope'));
  const limit = parseInt(c.req.query('limit') ?? '20', 10);

  const memories = recallMemoriesLocal(scope, limit);
  return c.json({ scope, memories, total: memories.length });
});

// POST /memory/recall
memory.post('/recall', async (c) => {
  const body = await c.req.json<{ query: string; scopes?: string[]; limit?: number }>();
  if (!body.query) return c.json({ error: 'Missing query' }, 400);

  const db = getDb();
  const limit = body.limit ?? 10;

  // Simple keyword-based local recall
  const keywords = body.query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (keywords.length === 0) {
    return c.json({ memories: [], total: 0 });
  }

  const scopeFilter = body.scopes?.length
    ? `AND (${body.scopes.map(() => 'scope = ?').join(' OR ')})`
    : '';

  const whereClause = keywords
    .map(() => `LOWER(content) LIKE ?`)
    .join(' OR ');

  const params = [
    ...keywords.map(k => `%${k}%`),
    ...(body.scopes ?? []),
  ];

  const rows = db.query<{ id: string; content: string; scope: string; type: string; stored_at: string }, SQLQueryBindings[]>(
    `SELECT id, content, scope, type, stored_at FROM memory_log
     WHERE (${whereClause}) ${scopeFilter}
     ORDER BY stored_at DESC
     LIMIT ?`
  ).all(...(params as SQLQueryBindings[]), limit);

  return c.json({ memories: rows, total: rows.length });
});

// POST /memory/store
memory.post('/store', async (c) => {
  const body = await c.req.json<{
    content: string;
    scope: string;
    type?: string;
    tags?: string[];
    jobId?: string;
    agentId?: string;
  }>();

  if (!body.content || !body.scope) {
    return c.json({ error: 'Missing content or scope' }, 400);
  }

  const id = storeMemoryLocal({
    content: body.content,
    scope: body.scope,
    type: body.type,
    tags: body.tags,
    jobId: body.jobId ?? 'manual',
    agentId: body.agentId ?? 'user',
  });

  return c.json({ id, stored: true }, 201);
});

// DELETE /memory/:id
memory.delete('/:id', (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const existing = db.query<{ id: string }, [string]>(
    'SELECT id FROM memory_log WHERE id = ?'
  ).get(id);

  if (!existing) return c.json({ error: 'Memory not found' }, 404);

  db.run('DELETE FROM memory_log WHERE id = ?', [id]);
  return c.json({ deleted: true });
});

export { memory };
