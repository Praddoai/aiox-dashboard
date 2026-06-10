import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { aiosCorePath, squadsPath } from '../lib/config';
import { log } from '../lib/logger';
import { recallMemories } from './memory-client';
import type { EngineConfig, Job } from '../types';

// Agent .md file format:
//   # {agent-id}
//   [activation notice]
//   ```yaml
//   [YAML config block]
//   ```
//   ## [Markdown sections]

interface AgentMeta {
  id: string;
  name: string;
  title: string;
  role: string;
  persona: string;       // full YAML block (persona section)
  principles: string;    // core_principles as text
  fullContent: string;   // entire file content
}

interface BuiltContext {
  prompt: string;
  hash: string;
  agentMeta: AgentMeta | null;
  memoriesUsed: number;
}

let config: EngineConfig;

export function initContextBuilder(cfg: EngineConfig): void {
  config = cfg;
}

export async function buildContext(job: Job): Promise<BuiltContext> {
  const input = JSON.parse(job.input_payload);
  const message = input.message || input.input || JSON.stringify(input);

  // 1. Load agent CLAUDE.md
  const agentMeta = loadAgentFile(job.agent_id, job.squad_id);

  // 2. Recall memories
  let memories = '';
  let memoriesUsed = 0;
  try {
    const recalled = await recallMemories(message, [
      'global',
      `squad:${job.squad_id}`,
      `agent:${job.agent_id}`,
    ], config.memory.recall_top_k);

    if (recalled.length > 0) {
      memories = formatMemories(recalled);
      memoriesUsed = recalled.length;
    }
  } catch (err) {
    log.warn('Memory recall failed, proceeding without memories', {
      jobId: job.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Load squad context (if exists)
  const squadContext = loadSquadContext(job.squad_id);

  // 4. Assemble prompt
  const sections: string[] = [];

  // Agent persona (full CLAUDE.md or fallback)
  if (agentMeta) {
    sections.push(agentMeta.fullContent);
  } else {
    sections.push(buildFallbackPersona(job.agent_id, job.squad_id));
  }

  // Squad context
  if (squadContext) {
    sections.push(`\n## Squad Context\n${squadContext}`);
  }

  // Recalled memories
  if (memories) {
    sections.push(`\n## Relevant Memories\n${memories}`);
  }

  // Task input
  sections.push(`\n## Current Task\n${message}`);

  // Add command context if provided
  if (input.command) {
    sections.push(`\n## Command\n*${input.command}`);
  }

  // Add extra context if provided
  if (input.context && typeof input.context === 'object') {
    sections.push(`\n## Additional Context\n${JSON.stringify(input.context, null, 2)}`);
  }

  let prompt = sections.join('\n\n');

  // 5. Trim to budget
  const budgetChars = config.memory.context_budget_tokens * 4; // ~4 chars/token
  if (prompt.length > budgetChars) {
    // Prioritize: persona > input > squad > memories
    // Trim memories first, then squad context
    prompt = trimToBudget(prompt, budgetChars, agentMeta?.fullContent.length ?? 0);
  }

  // 6. Hash for dedup/cache
  const hash = createHash('sha256').update(prompt).digest('hex').slice(0, 16);

  log.info('Context built', {
    jobId: job.id,
    agent: job.agent_id,
    hasPersona: !!agentMeta,
    memoriesUsed,
    promptLength: prompt.length,
    hash,
  });

  return { prompt, hash, agentMeta, memoriesUsed };
}

function loadAgentFile(agentId: string, squadId: string): AgentMeta | null {
  // Try paths in order:
  // 1. .aios-core/development/agents/{agentId}.md (core agents)
  // 2. squads/{squadId}/agents/{agentId}.md (squad-specific agents)
  const paths = [
    aiosCorePath('development', 'agents', `${agentId}.md`),
    squadsPath(squadId, 'agents', `${agentId}.md`),
  ];

  for (const path of paths) {
    if (!existsSync(path)) continue;

    try {
      const content = readFileSync(path, 'utf-8');
      const meta = parseAgentMd(agentId, content);
      log.debug('Loaded agent file', { agentId, path, size: content.length });
      return meta;
    } catch (err) {
      log.warn('Failed to parse agent file', {
        agentId, path,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.debug('No agent file found', { agentId, squadId });
  return null;
}

function parseAgentMd(agentId: string, content: string): AgentMeta {
  // Extract YAML block between ```yaml and ```
  const yamlMatch = content.match(/```yaml\n([\s\S]*?)```/);
  const yamlBlock = yamlMatch?.[1] ?? '';

  // Extract key fields from YAML (simple regex, no full parser needed)
  const name = extractYamlField(yamlBlock, 'name') || agentId;
  const title = extractYamlField(yamlBlock, 'title') || '';
  const role = extractYamlField(yamlBlock, 'role') || '';

  // Extract persona section
  const personaMatch = yamlBlock.match(/persona:\n([\s\S]*?)(?=\n\w|\n$)/);
  const persona = personaMatch?.[1] ?? '';

  // Extract core_principles
  const principlesMatch = yamlBlock.match(/core_principles:\n([\s\S]*?)(?=\n\w|\n$)/);
  const principles = principlesMatch?.[1] ?? '';

  return {
    id: agentId,
    name,
    title,
    role,
    persona,
    principles,
    fullContent: content,
  };
}

function extractYamlField(yaml: string, field: string): string | null {
  // Simple extraction: "  field: value" or "  field: 'value'"
  const regex = new RegExp(`\\b${field}:\\s*['"]?([^'"\n]+)['"]?`, 'm');
  const match = yaml.match(regex);
  return match?.[1]?.trim() ?? null;
}

function loadSquadContext(squadId: string): string | null {
  // Try squad config
  const paths = [
    squadsPath(squadId, 'squad.yaml'),
    squadsPath(squadId, 'config.yaml'),
  ];

  for (const path of paths) {
    if (!existsSync(path)) continue;

    try {
      const content = readFileSync(path, 'utf-8');
      // Extract description and objectives from YAML
      const descMatch = content.match(/description:\s*\|?\n([\s\S]*?)(?=\n\w)/);
      const desc = descMatch?.[1]?.trim() ?? '';
      return desc || content.slice(0, 500); // Limit squad context
    } catch {
      continue;
    }
  }

  return null;
}

function buildFallbackPersona(agentId: string, squadId: string): string {
  return `# Agent: ${agentId}
Squad: ${squadId}

You are an AI agent named "${agentId}" in the "${squadId}" squad.
Follow the instructions in your task carefully.
Produce structured, high-quality output.
`;
}

function formatMemories(memories: Array<{ content: string; scope: string; score?: number }>): string {
  return memories
    .map((m, i) => `${i + 1}. [${m.scope}] ${m.content}`)
    .join('\n');
}

function trimToBudget(prompt: string, budgetChars: number, _personaLength: number): string {
  if (prompt.length <= budgetChars) return prompt;

  // Split into sections and trim from the end (memories first, then squad)
  const sections = prompt.split('\n## ');
  let result = sections[0]; // Always keep persona/first section
  let remaining = budgetChars - result.length;

  // Add sections back in reverse priority
  const prioritized = sections.slice(1);
  // Current Task is highest priority after persona
  const taskIdx = prioritized.findIndex(s => s.startsWith('Current Task'));
  if (taskIdx >= 0) {
    const task = '\n## ' + prioritized.splice(taskIdx, 1)[0];
    result += task;
    remaining -= task.length;
  }

  // Add remaining sections if space permits
  for (const section of prioritized) {
    const full = '\n## ' + section;
    if (full.length <= remaining) {
      result += full;
      remaining -= full.length;
    }
  }

  return result;
}
