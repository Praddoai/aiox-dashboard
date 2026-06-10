import { Hono } from 'hono';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { parse as parseYaml } from 'yaml';
import { getProjectPaths, aiosCorePath, squadsPath } from '../lib/config';
import { log } from '../lib/logger';

// ============================================================
// /registry — Project registry routes (squads, agents, workflows)
// Makes the engine the single data gateway for any connected project.
// ============================================================

export const registry = new Hono();

// ── Types ──────────────────────────────────────────────────

interface SquadInfo {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  agentCount: number;
  taskCount: number;
  hasConfig: boolean;
}

interface AgentInfo {
  id: string;
  name: string;
  squadId: string;
  role?: string;
  description?: string;
  filePath: string;
}

// ── GET /registry/squads ───────────────────────────────────

registry.get('/squads', (c) => {
  try {
    const squads = discoverSquads();
    return c.json({ squads, count: squads.length, projectRoot: getProjectPaths().projectRoot });
  } catch (err) {
    log.error('Failed to discover squads', { error: (err as Error).message });
    return c.json({ squads: [], count: 0, error: (err as Error).message }, 500);
  }
});

// ── GET /registry/agents ──────────────────────────────────

registry.get('/agents', (c) => {
  const squadFilter = c.req.query('squad');
  try {
    const agents = discoverAgents(squadFilter);
    return c.json({ agents, count: agents.length });
  } catch (err) {
    log.error('Failed to discover agents', { error: (err as Error).message });
    return c.json({ agents: [], count: 0, error: (err as Error).message }, 500);
  }
});

// ── GET /registry/agents/:squadId/:agentId ────────────────

registry.get('/agents/:squadId/:agentId', (c) => {
  const { squadId, agentId } = c.req.param();
  try {
    const agent = loadAgentDetail(squadId, agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    return c.json(agent);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── GET /registry/workflows ───────────────────────────────

registry.get('/workflows', (c) => {
  try {
    const workflows = discoverWorkflows();
    return c.json({ workflows, count: workflows.length });
  } catch (err) {
    return c.json({ workflows: [], count: 0, error: (err as Error).message }, 500);
  }
});

// ── GET /registry/tasks ───────────────────────────────────

registry.get('/tasks', (c) => {
  try {
    const tasks = discoverTasks();
    return c.json({ tasks, count: tasks.length });
  } catch (err) {
    return c.json({ tasks: [], count: 0, error: (err as Error).message }, 500);
  }
});

// ── GET /registry/project ─────────────────────────────────

registry.get('/project', (c) => {
  const paths = getProjectPaths();
  return c.json({
    projectRoot: paths.projectRoot,
    aiosCore: paths.aiosCore,
    squads: paths.squads,
    rules: paths.rules,
    engineRoot: paths.engineRoot,
    hasAiosCore: existsSync(paths.aiosCore),
    hasSquads: existsSync(paths.squads),
    hasRules: existsSync(paths.rules),
  });
});

// ============================================================
// Discovery Logic
// ============================================================

function discoverSquads(): SquadInfo[] {
  const squads: SquadInfo[] = [];

  // 1. Try SQUAD-REGISTRY.yaml first (fast path)
  const registryPath = aiosCorePath('SQUAD-REGISTRY.yaml');
  if (existsSync(registryPath)) {
    try {
      const raw = readFileSync(registryPath, 'utf-8');
      const parsed = parseYaml(raw) as Record<string, unknown>;
      const squadsData = (parsed as Record<string, Record<string, unknown>[]>).squads || [];
      for (const s of squadsData) {
        squads.push({
          id: String(s.id || s.name || ''),
          name: formatName(String(s.name || s.id || '')),
          description: s.description ? String(s.description) : undefined,
          domain: s.domain ? String(s.domain) : undefined,
          agentCount: Array.isArray(s.agents) ? s.agents.length : 0,
          taskCount: 0,
          hasConfig: true,
        });
      }
      if (squads.length > 0) return squads;
    } catch { /* fall through to directory scan */ }
  }

  // 2. Scan squads/ directory
  const squadsDir = getProjectPaths().squads;
  if (!existsSync(squadsDir)) return squads;

  const entries = readdirSync(squadsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const squadDir = resolve(squadsDir, entry.name);
    const configPath = resolve(squadDir, 'squad.yaml');
    const altConfigPath = resolve(squadDir, 'config.yaml');
    const hasConfig = existsSync(configPath) || existsSync(altConfigPath);

    let name = formatName(entry.name);
    let description: string | undefined;
    let domain: string | undefined;

    if (hasConfig) {
      try {
        const raw = readFileSync(existsSync(configPath) ? configPath : altConfigPath, 'utf-8');
        const parsed = parseYaml(raw) as Record<string, string>;
        name = parsed.name || name;
        description = parsed.description;
        domain = parsed.domain;
      } catch { /* use defaults */ }
    }

    const agentsDir = resolve(squadDir, 'agents');
    const tasksDir = resolve(squadDir, 'tasks');

    squads.push({
      id: entry.name,
      name,
      description,
      domain,
      agentCount: countMdFiles(agentsDir),
      taskCount: countMdFiles(tasksDir),
      hasConfig,
    });
  }

  return squads;
}

function discoverAgents(squadFilter?: string): AgentInfo[] {
  const agents: AgentInfo[] = [];

  // 1. Core agents from .aios-core/development/agents/
  const coreAgentsDir = aiosCorePath('development', 'agents');
  if (existsSync(coreAgentsDir)) {
    const files = readdirSync(coreAgentsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const id = basename(file, '.md');
      if (squadFilter && squadFilter !== 'core') continue;
      const filePath = resolve(coreAgentsDir, file);
      const { role, description } = parseAgentHeader(filePath);
      agents.push({ id, name: formatName(id), squadId: 'core', role, description, filePath });
    }
  }

  // 2. Squad-specific agents from squads/{id}/agents/
  const squadsDir = getProjectPaths().squads;
  if (existsSync(squadsDir)) {
    const squadDirs = readdirSync(squadsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'));

    for (const squad of squadDirs) {
      if (squadFilter && squadFilter !== squad.name) continue;
      const agentsDir = resolve(squadsDir, squad.name, 'agents');
      if (!existsSync(agentsDir)) continue;

      const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const id = basename(file, '.md');
        const filePath = resolve(agentsDir, file);
        const { role, description } = parseAgentHeader(filePath);
        agents.push({ id, name: formatName(id), squadId: squad.name, role, description, filePath });
      }
    }
  }

  return agents;
}

function loadAgentDetail(squadId: string, agentId: string): Record<string, unknown> | null {
  const paths = [
    squadsPath(squadId, 'agents', `${agentId}.md`),
    aiosCorePath('development', 'agents', `${agentId}.md`),
  ];

  for (const p of paths) {
    if (!existsSync(p)) continue;
    const content = readFileSync(p, 'utf-8');
    const { role, description } = parseAgentHeader(p);
    return { id: agentId, squadId, name: formatName(agentId), role, description, content, filePath: p };
  }

  return null;
}

function discoverWorkflows(): Record<string, unknown>[] {
  const workflows: Record<string, unknown>[] = [];
  const dir = aiosCorePath('development', 'workflows');
  if (!existsSync(dir)) return workflows;

  const files = readdirSync(dir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  for (const file of files) {
    try {
      const raw = readFileSync(resolve(dir, file), 'utf-8');
      const parsed = parseYaml(raw) as Record<string, unknown>;
      workflows.push({
        id: basename(file, extname(file)),
        name: parsed.name || formatName(basename(file, extname(file))),
        description: parsed.description || '',
        phases: Array.isArray(parsed.phases) ? parsed.phases.length : 0,
        file,
      });
    } catch { /* skip broken files */ }
  }

  return workflows;
}

function discoverTasks(): Record<string, unknown>[] {
  const tasks: Record<string, unknown>[] = [];
  const dir = aiosCorePath('development', 'tasks');
  if (!existsSync(dir)) return tasks;

  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const id = basename(file, '.md');
    tasks.push({ id, name: formatName(id), file });
  }

  return tasks;
}

// ── Helpers ────────────────────────────────────────────────

function countMdFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir).filter(f => f.endsWith('.md')).length;
  } catch { return 0; }
}

function formatName(slug: string): string {
  return slug
    .replace(/\.(md|yaml|yml|json)$/i, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseAgentHeader(filePath: string): { role?: string; description?: string } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').slice(0, 10);
    let role: string | undefined;
    let description: string | undefined;

    for (const line of lines) {
      if (line.startsWith('# ')) continue; // skip title
      if (!description && line.trim() && !line.startsWith('#')) {
        description = line.trim().slice(0, 200);
      }
      const roleMatch = line.match(/role:\s*(.+)/i) || line.match(/\*\*Role\*\*:\s*(.+)/i);
      if (roleMatch) role = roleMatch[1].trim();
    }

    return { role, description };
  } catch { return {}; }
}
