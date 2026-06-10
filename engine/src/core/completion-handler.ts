import { ulid } from 'ulid';
import { getDb } from '../lib/db';
import { log } from '../lib/logger';
import { broadcast } from '../lib/ws';
import { storeMemory, storeMemoryLocal } from './memory-client';
import { cleanupWorkspace, type WorkspaceInfo } from './workspace-manager';
import { onJobCompleted } from './workflow-engine';
import { parseDelegation, executeDelegation, onSubJobCompleted } from './delegation-protocol';
import type { EngineConfig, Job } from '../types';

let config: EngineConfig;

export function initCompletionHandler(cfg: EngineConfig): void {
  config = cfg;
}

interface CompletionInput {
  job: Job;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  workspace?: WorkspaceInfo;
}

export async function handleCompletion(input: CompletionInput): Promise<void> {
  const { job, exitCode, stdout, stderr, durationMs, workspace } = input;
  const success = exitCode === 0;

  // 1. Detect artifacts
  let filesChanged = 0;
  if (workspace?.type === 'worktree') {
    filesChanged = await detectGitChanges(workspace.path);
  }

  // 2. Extract and store memories from output
  let memoryStored = 0;
  if (success && stdout) {
    memoryStored = await extractAndStoreMemories(job, stdout);
  }

  // 3. Record execution metrics
  recordExecution({
    jobId: job.id,
    squadId: job.squad_id,
    agentId: job.agent_id,
    durationMs,
    exitCode,
    filesChanged,
    memoryStored,
    success,
  });

  // 4. Notify dashboard
  if (success) {
    broadcast('job:completed', {
      jobId: job.id,
      squadId: job.squad_id,
      agentId: job.agent_id,
      duration_ms: durationMs,
      files_changed: filesChanged,
      memory_stored: memoryStored,
    });
  } else {
    broadcast('job:failed', {
      jobId: job.id,
      squadId: job.squad_id,
      agentId: job.agent_id,
      exitCode,
      error: stderr.slice(0, 500),
      duration_ms: durationMs,
    });
  }

  // 5. Send callback if configured
  if (job.callback_url && success) {
    await sendCallback(job, exitCode, stdout, durationMs, filesChanged, memoryStored);
  }

  // 6. Signal workflow engine if part of workflow
  if (job.workflow_id) {
    try {
      onJobCompleted(job);
    } catch (err) {
      log.warn('Workflow engine error on job completion', {
        workflowId: job.workflow_id,
        jobId: job.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 6b. Check for delegation markers in output
  if (success && stdout) {
    const delegations = parseDelegation(stdout);
    if (delegations) {
      log.info('Delegation detected in output', {
        jobId: job.id,
        taskCount: delegations.length,
      });
      executeDelegation(job, delegations);
    }
  }

  // 6c. Check if this is a sub-job (delegation result)
  if (job.parent_job_id) {
    try {
      onSubJobCompleted(job);
    } catch (err) {
      log.warn('Delegation sub-job completion error', {
        jobId: job.id,
        parentJobId: job.parent_job_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 7. Cleanup workspace
  if (workspace && config.workspace.cleanup_on_success && success) {
    cleanupWorkspace(workspace);
  }

  log.info('Completion handled', {
    jobId: job.id,
    success,
    durationMs,
    filesChanged,
    memoryStored,
    callbackSent: !!job.callback_url,
  });
}

// -- Memory Extraction --

interface ExtractedMemory {
  scope: string;
  content: string;
  type?: string;
}

function parseMemoryProtocol(output: string): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];

  // Pattern 1: Structured memory protocol
  // ### Scope: squad:financeiro
  // - [TENDENCIA] Some insight here
  // - [PADRAO] Another insight
  const scopeRegex = /###\s*Scope:\s*(.+)\n([\s\S]*?)(?=###\s*Scope:|$)/g;
  let match: RegExpExecArray | null;

  while ((match = scopeRegex.exec(output)) !== null) {
    const scope = match[1].trim();
    const block = match[2];

    // Extract items with optional type tag
    const itemRegex = /-\s*\[(\w+)\]\s*(.+)/g;
    let item: RegExpExecArray | null;

    while ((item = itemRegex.exec(block)) !== null) {
      memories.push({
        scope,
        type: item[1],
        content: item[2].trim(),
      });
    }

    // Also capture plain items without type
    const plainRegex = /-\s*(?!\[)(.+)/g;
    let plain: RegExpExecArray | null;
    while ((plain = plainRegex.exec(block)) !== null) {
      // Skip if already captured as typed item
      const text = plain[1].trim();
      if (!text.startsWith('[')) {
        memories.push({ scope, content: text });
      }
    }
  }

  // Pattern 2: Simple "## Para Salvar em Memoria" section
  const simpleMatch = output.match(/##\s*Para Salvar em Mem[oó]ria\n([\s\S]*?)(?=\n##|$)/i);
  if (simpleMatch && memories.length === 0) {
    const lines = simpleMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
    for (const line of lines) {
      const cleaned = line.replace(/^-\s*/, '').trim();
      if (cleaned) {
        memories.push({ scope: 'global', content: cleaned });
      }
    }
  }

  return memories;
}

async function extractAndStoreMemories(job: Job, output: string): Promise<number> {
  const extracted = parseMemoryProtocol(output);
  if (extracted.length === 0) return 0;

  let stored = 0;
  for (const mem of extracted) {
    try {
      // Store locally always (reliable)
      storeMemoryLocal({
        content: mem.content,
        scope: mem.scope,
        type: mem.type,
        jobId: job.id,
        agentId: job.agent_id,
      });

      // Try to store in Supermemory too (best-effort)
      storeMemory({
        content: mem.content,
        scope: mem.scope,
        type: mem.type,
        jobId: job.id,
        agentId: job.agent_id,
      }).catch(() => { /* graceful degradation */ });

      stored++;
    } catch (err) {
      log.warn('Failed to store memory', {
        scope: mem.scope,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info('Memories extracted and stored', {
    jobId: job.id,
    extracted: extracted.length,
    stored,
  });

  return stored;
}

// -- Artifact Detection --

async function detectGitChanges(workspacePath: string): Promise<number> {
  try {
    const proc = Bun.spawn(
      ['git', 'diff', '--stat', '--cached', 'HEAD'],
      { cwd: workspacePath, stdout: 'pipe', stderr: 'pipe' },
    );

    const exitCode = await proc.exited;
    if (exitCode !== 0) return 0;

    const stdout = await new Response(proc.stdout).text();
    // Count lines that represent changed files (exclude summary line)
    const lines = stdout.trim().split('\n').filter(l => l.includes('|'));
    return lines.length;
  } catch {
    return 0;
  }
}

// -- Execution Recording --

function recordExecution(data: {
  jobId: string;
  squadId: string;
  agentId: string;
  durationMs: number;
  exitCode: number;
  filesChanged: number;
  memoryStored: number;
  success: boolean;
}): void {
  const db = getDb();
  const id = ulid();

  db.run(
    `INSERT INTO executions (id, job_id, squad_id, agent_id, duration_ms, exit_code,
      files_changed, memory_stored, success, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, data.jobId, data.squadId, data.agentId, data.durationMs,
     data.exitCode, data.filesChanged, data.memoryStored, data.success ? 1 : 0],
  );
}

// -- Callback --

async function sendCallback(
  job: Job,
  exitCode: number,
  output: string,
  durationMs: number,
  filesChanged: number,
  memoryStored: number,
): Promise<void> {
  if (!job.callback_url) return;

  const maxRetries = 3;
  const payload = {
    job_id: job.id,
    status: exitCode === 0 ? 'completed' : 'failed',
    agent: `${job.squad_id}/${job.agent_id}`,
    output: output.slice(0, 5000), // Limit output size
    duration_ms: durationMs,
    files_changed: filesChanged,
    memory_stored: memoryStored,
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(job.callback_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        log.info('Callback sent', { jobId: job.id, url: job.callback_url });
        return;
      }

      log.warn('Callback failed', {
        jobId: job.id, attempt, status: res.status,
      });
    } catch (err) {
      log.warn('Callback request failed', {
        jobId: job.id, attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}
