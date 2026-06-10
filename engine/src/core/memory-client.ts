import { log } from '../lib/logger';

// Memory Client — abstracts Supermemory and Qdrant MCP backends
// For v1: calls MCP tools via claude CLI subprocess
// Future: direct API calls if SDKs become available

export interface RecalledMemory {
  content: string;
  scope: string;
  score?: number;
  timestamp?: string;
}

export interface StoreMemoryInput {
  content: string;
  scope: string;
  type?: string;      // TENDENCIA, PADRAO, DECISAO, APRENDIZADO
  tags?: string[];
  jobId: string;
  agentId: string;
}

// In-memory cache for recent memories (avoids repeated MCP calls)
const memoryCache = new Map<string, { data: RecalledMemory[]; ts: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

export async function recallMemories(
  query: string,
  scopes: string[],
  topK: number = 10,
): Promise<RecalledMemory[]> {
  // Check cache
  const cacheKey = `${query.slice(0, 100)}:${scopes.join(',')}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    log.debug('Memory recall from cache', { scopes, count: cached.data.length });
    return cached.data;
  }

  const results: RecalledMemory[] = [];

  for (const scope of scopes) {
    try {
      const scopeResults = await recallFromSupermemory(query, scope, topK);
      results.push(...scopeResults);
    } catch (err) {
      log.warn('Supermemory recall failed for scope', {
        scope,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Sort by relevance score descending, limit to topK total
  results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const limited = results.slice(0, topK);

  // Cache results
  memoryCache.set(cacheKey, { data: limited, ts: Date.now() });

  log.info('Memory recall completed', { scopes, total: limited.length });
  return limited;
}

export async function storeMemory(input: StoreMemoryInput): Promise<boolean> {
  try {
    await storeToSupermemory(input);

    log.info('Memory stored', {
      scope: input.scope,
      type: input.type,
      jobId: input.jobId,
      contentLen: input.content.length,
    });

    // Invalidate cache for this scope
    for (const [key] of memoryCache) {
      if (key.includes(input.scope)) {
        memoryCache.delete(key);
      }
    }

    return true;
  } catch (err) {
    log.error('Memory store failed', {
      scope: input.scope,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// -- Backend Implementations --

async function recallFromSupermemory(
  query: string,
  scope: string,
  topK: number,
): Promise<RecalledMemory[]> {
  // Call Supermemory MCP via subprocess
  // mcp__mcp-supermemory-ai__recall expects { query }
  try {
    const spawnEnv = { ...process.env };
    delete spawnEnv.CLAUDECODE;

    const proc = Bun.spawn([
      'claude', '-p',
      `Use the supermemory recall tool to search for memories matching: "${query}". Scope: ${scope}. Return the top ${topK} results as a JSON array with fields: content, score. Only output the JSON array, nothing else.`,
      '--output-format', 'text',
      '--max-turns', '1',
      '--dangerously-skip-permissions',
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: spawnEnv,
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return [];
    }

    const stdout = await new Response(proc.stdout).text();

    // Try to extract JSON array from output
    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((m: { content: string; score?: number }) => ({
      content: m.content,
      scope,
      score: m.score ?? 0.5,
    }));
  } catch {
    // Graceful degradation: if MCP is unavailable, return empty
    return [];
  }
}

async function storeToSupermemory(input: StoreMemoryInput): Promise<void> {
  const metadata = [
    `Scope: ${input.scope}`,
    input.type ? `Type: ${input.type}` : '',
    input.tags?.length ? `Tags: ${input.tags.join(', ')}` : '',
    `Agent: ${input.agentId}`,
    `Job: ${input.jobId}`,
  ].filter(Boolean).join('. ');

  try {
    const storeEnv = { ...process.env };
    delete storeEnv.CLAUDECODE;

    const proc = Bun.spawn([
      'claude', '-p',
      `Use the supermemory memory tool to store this memory: "${input.content}". Metadata: ${metadata}`,
      '--output-format', 'text',
      '--max-turns', '1',
      '--dangerously-skip-permissions',
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: storeEnv,
    });

    await proc.exited;
  } catch {
    // Log handled by caller
    throw new Error('Supermemory store subprocess failed');
  }
}

// -- Direct memory operations (no MCP, for local storage fallback) --

import { getDb } from '../lib/db';
import { ulid } from 'ulid';

export function storeMemoryLocal(input: StoreMemoryInput): string {
  const db = getDb();
  const id = ulid();

  db.run(
    `INSERT INTO memory_log (id, job_id, scope, content, type, tags, backend, stored_at)
     VALUES (?, ?, ?, ?, ?, ?, 'local', datetime('now'))`,
    [id, input.jobId, input.scope, input.content, input.type ?? null,
     input.tags ? JSON.stringify(input.tags) : null],
  );

  return id;
}

export function recallMemoriesLocal(
  scope: string,
  limit: number = 10,
): RecalledMemory[] {
  const db = getDb();

  const rows = db.query<{ content: string; scope: string; stored_at: string }, [string, number]>(
    `SELECT content, scope, stored_at FROM memory_log
     WHERE scope = ? OR scope = 'global'
     ORDER BY stored_at DESC
     LIMIT ?`
  ).all(scope, limit);

  return rows.map(r => ({
    content: r.content,
    scope: r.scope,
    timestamp: r.stored_at,
  }));
}
