import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { enginePath, projectPath } from '../lib/config';
import { log } from '../lib/logger';
import type { EngineConfig, Job } from '../types';

// Squad types that work with code (use git worktree)
const CODE_SQUAD_TYPES = new Set([
  'engineering', 'development', 'full-stack-dev', 'aios-core-dev',
  'design-system', 'design',
]);

let config: EngineConfig;

export function initWorkspaceManager(cfg: EngineConfig): void {
  config = cfg;
}

export interface WorkspaceInfo {
  path: string;
  type: 'worktree' | 'directory';
  branch?: string;
}

export async function createWorkspace(job: Job): Promise<WorkspaceInfo> {
  const baseDir = resolve(enginePath(config.workspace.base_dir));
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  // Check concurrent workspace limit
  const existing = existsSync(baseDir) ? readdirSync(baseDir).length : 0;
  if (existing >= config.workspace.max_concurrent) {
    throw new Error(`Workspace limit reached (${config.workspace.max_concurrent}). Clean up old workspaces.`);
  }

  const workspacePath = resolve(baseDir, job.id);
  const isCodeSquad = isCodeRelated(job.squad_id);

  if (isCodeSquad) {
    return createWorktree(job, workspacePath);
  }

  return createDirectory(job, workspacePath);
}

export function cleanupWorkspace(workspace: WorkspaceInfo): void {
  try {
    if (workspace.type === 'worktree') {
      removeWorktree(workspace.path);
    } else {
      if (existsSync(workspace.path)) {
        rmSync(workspace.path, { recursive: true, force: true });
      }
    }
    log.info('Workspace cleaned up', { path: workspace.path, type: workspace.type });
  } catch (err) {
    log.warn('Workspace cleanup failed', {
      path: workspace.path,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// -- Internal --

function isCodeRelated(squadId: string): boolean {
  // Check if squad ID contains code-related keywords
  const lower = squadId.toLowerCase();
  for (const type of CODE_SQUAD_TYPES) {
    if (lower.includes(type)) return true;
  }
  // Common squad names
  if (lower.includes('dev') || lower.includes('eng') || lower.includes('code')) return true;
  return false;
}

async function createWorktree(job: Job, workspacePath: string): Promise<WorkspaceInfo> {
  const projectRoot = projectPath(); // aios-platform root
  const branch = `job/${job.id}`;

  // Check if git repo exists — check parent dirs up to 3 levels
  let gitRoot = projectRoot;
  let foundGit = false;
  for (let i = 0; i < 4; i++) {
    if (existsSync(resolve(gitRoot, '.git'))) {
      foundGit = true;
      break;
    }
    const parent = resolve(gitRoot, '..');
    if (parent === gitRoot) break;
    gitRoot = parent;
  }

  if (!foundGit) {
    log.warn('No .git directory found, falling back to directory workspace', { projectRoot });
    return createDirectory(job, workspacePath);
  }

  try {
    const proc = Bun.spawn(
      ['git', 'worktree', 'add', workspacePath, '-b', branch],
      {
        cwd: gitRoot,
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      log.warn('Git worktree creation failed, falling back to directory', {
        exitCode, stderr: stderr.slice(0, 200),
      });
      return createDirectory(job, workspacePath);
    }

    // Write input file to worktree
    const input = JSON.parse(job.input_payload);
    writeFileSync(resolve(workspacePath, 'input.md'), formatInput(input));

    log.info('Git worktree created', { path: workspacePath, branch });
    return { path: workspacePath, type: 'worktree', branch };
  } catch (err) {
    log.warn('Git worktree exception, falling back to directory', {
      error: err instanceof Error ? err.message : String(err),
    });
    return createDirectory(job, workspacePath);
  }
}

function removeWorktree(workspacePath: string): void {
  try {
    const projectRoot = projectPath();
    const proc = Bun.spawnSync(
      ['git', 'worktree', 'remove', workspacePath, '--force'],
      { cwd: projectRoot, stdout: 'pipe', stderr: 'pipe' },
    );

    if (proc.exitCode !== 0) {
      // Fallback: just remove the directory
      if (existsSync(workspacePath)) {
        rmSync(workspacePath, { recursive: true, force: true });
      }
    }
  } catch {
    if (existsSync(workspacePath)) {
      rmSync(workspacePath, { recursive: true, force: true });
    }
  }
}

function createDirectory(job: Job, workspacePath: string): WorkspaceInfo {
  mkdirSync(workspacePath, { recursive: true });

  // Write input file
  const input = JSON.parse(job.input_payload);
  writeFileSync(resolve(workspacePath, 'input.md'), formatInput(input));

  log.info('Directory workspace created', { path: workspacePath });
  return { path: workspacePath, type: 'directory' };
}

function formatInput(input: Record<string, unknown>): string {
  const sections: string[] = ['# Job Input\n'];

  if (input.message) {
    sections.push(`## Message\n${input.message}\n`);
  }
  if (input.tipo) {
    sections.push(`## Type\n${input.tipo}\n`);
  }
  if (input.command) {
    sections.push(`## Command\n*${input.command}\n`);
  }
  if (input.context) {
    sections.push(`## Context\n\`\`\`json\n${JSON.stringify(input.context, null, 2)}\n\`\`\`\n`);
  }

  return sections.join('\n');
}
