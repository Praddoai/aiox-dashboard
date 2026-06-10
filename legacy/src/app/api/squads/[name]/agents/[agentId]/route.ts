import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  formatName,
  getProjectRoot,
  resolvePathWithin,
  resolveSquadSectionDir,
  sanitizeRelativePath,
} from '@/lib/squad-api-utils';

// Extract YAML block from markdown agent file
function extractYamlFromMarkdown(content: string): Record<string, unknown> | null {
  // Match ```yaml ... ``` blocks
  const yamlMatch = content.match(/```ya?ml\n([\s\S]*?)```/);
  if (yamlMatch) {
    try {
      return yaml.load(yamlMatch[1]) as Record<string, unknown>;
    } catch {
      // Not valid YAML
    }
  }

  // Try frontmatter ---\n...\n---
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    try {
      return yaml.load(frontmatterMatch[1]) as Record<string, unknown>;
    } catch {
      // Not valid YAML
    }
  }

  return null;
}

interface ParsedTask {
  id: string;
  name: string;
  description: string;
  category: string;
  agent: string;
  inputs: string[];
  outputs: string[];
  responsibilities: string[];
  antiPatterns: string[];
  tools: string[];
  estimatedDuration: string;
}

// Parse a task markdown file to extract structured data
function parseTaskFile(content: string, taskId: string): ParsedTask {
  const task: ParsedTask = {
    id: taskId,
    name: '',
    description: '',
    category: '',
    agent: '',
    inputs: [],
    outputs: [],
    responsibilities: [],
    antiPatterns: [],
    tools: [],
    estimatedDuration: '',
  };

  // Extract title from first H1 or "# Task: Name"
  const titleMatch = content.match(/^#\s+(?:Task:\s*)?(.+)$/m);
  if (titleMatch) {
    task.name = titleMatch[1].trim();
  } else {
    task.name = formatName(taskId);
  }

  // Try to extract YAML metadata block
  const yamlData = extractYamlFromMarkdown(content);
  if (yamlData) {
    task.description = (yamlData.description as string) || '';
    task.category = (yamlData.category as string) || '';
    task.agent = (yamlData.agent as string) || '';
    task.estimatedDuration = (yamlData.estimated_duration as string) || '';
  }

  // Extract description from ## Description section
  if (!task.description) {
    const descMatch = content.match(/##\s*(?:Description|Purpose)\s*\n([\s\S]*?)(?=\n##|\n```|$)/i);
    if (descMatch) {
      task.description = descMatch[1].trim().split('\n\n')[0].slice(0, 300);
    }
  }

  // Extract from table metadata (| **Field** | Value |)
  const tableRegex = /\|\s*\*\*([^*|]+)\*\*\s*\|\s*([^|]+)\s*\|/g;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const field = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (field.includes('executor') || field.includes('responsible') || field.includes('agent')) {
      task.agent = value;
    }
    if (field.includes('duration') || field.includes('estimated')) {
      task.estimatedDuration = value;
    }
    if (field.includes('category')) {
      task.category = value;
    }
  }

  // Extract inputs section - look for bullet points under ## Inputs
  const inputsMatch = content.match(/##\s*Inputs?\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (inputsMatch) {
    const inputLines = inputsMatch[1]
      .split('\n')
      .filter((l) => l.match(/^[-*]\s+/) || l.match(/^\d+\.\s+/))
      .map((l) => l.replace(/^[-*\d.]+\s+/, '').trim())
      .filter(Boolean);
    task.inputs = inputLines.slice(0, 10);
  }

  // Extract outputs section
  const outputsMatch = content.match(/##\s*(?:Outputs?|Output\s+Summary|Deliverables?)\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (outputsMatch) {
    const outputLines = outputsMatch[1]
      .split('\n')
      .filter((l) => l.match(/^[-*]\s+/) || l.match(/^\d+\.\s+/))
      .map((l) => l.replace(/^[-*\d.]+\s+/, '').trim())
      .filter(Boolean);
    task.outputs = outputLines.slice(0, 10);
  }

  // Extract responsibilities from workflow/steps section
  const workflowMatch = content.match(/##\s*(?:Workflow|Steps|Phases?|Processo)\s*\n([\s\S]*?)(?=\n##\s+[A-Z]|$)/i);
  if (workflowMatch) {
    const respLines = workflowMatch[1]
      .split('\n')
      .filter((l) => l.match(/^\d+\.\s+/))
      .map((l) => l.replace(/^\d+\.\s+/, '').trim())
      .filter(Boolean);
    task.responsibilities = respLines.slice(0, 8);
  }

  // Extract anti-patterns
  const antiMatch = content.match(/##\s*(?:Anti[- ]?Patterns?|Não\s+faz|Never)\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (antiMatch) {
    const antiLines = antiMatch[1]
      .split('\n')
      .filter((l) => l.match(/^[-*]\s+/))
      .map((l) => l.replace(/^[-*]+\s+/, '').trim())
      .filter(Boolean);
    task.antiPatterns = antiLines.slice(0, 6);
  }

  // Also try to extract anti-patterns from YAML block
  if (yamlData?.anti_patterns) {
    const ap = yamlData.anti_patterns as Record<string, string[]>;
    if (ap.never_do && task.antiPatterns.length === 0) {
      task.antiPatterns = ap.never_do.slice(0, 6);
    }
  }

  return task;
}

interface AgentDetail {
  id: string;
  name: string;
  title: string;
  icon: string;
  role: string;
  tier: string;
  description: string;
  principles: string[];
  tools: string[];
  commands: string[];
  tasks: ParsedTask[];
  handoffs: { agent: string; when: string; squad?: string }[];
  sourceMarkdown?: string;
  sourcePath?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string; agentId: string }> }
) {
  try {
    const { name: squadName, agentId } = await params;
    const projectRoot = getProjectRoot();
    const squadDir = path.join(projectRoot, 'squads', squadName);
    const normalizedAgentId = agentId.replace(/\.md$/i, '');

    const agentsDir = resolveSquadSectionDir(projectRoot, squadName, 'agents');
    if (!agentsDir) {
      return NextResponse.json({ error: 'Invalid squad path' }, { status: 400 });
    }

    const relativeAgentPath = sanitizeRelativePath(`${normalizedAgentId}.md`);
    const agentPath = relativeAgentPath ? resolvePathWithin(agentsDir, relativeAgentPath) : null;
    if (!agentPath) {
      return NextResponse.json({ error: `Invalid agent id '${agentId}'` }, { status: 400 });
    }

    // Read agent markdown file
    let agentContent: string;
    try {
      agentContent = await fs.readFile(agentPath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: `Agent '${agentId}' not found in squad '${squadName}'` },
        { status: 404 }
      );
    }

    // Parse agent YAML
    const agentYaml = extractYamlFromMarkdown(agentContent);

    const agentData = (agentYaml?.agent || {}) as Record<string, unknown>;
    const persona = (agentYaml?.persona || agentYaml?.persona_profile || {}) as Record<string, unknown>;
    const deps = (agentYaml?.dependencies || {}) as Record<string, string[]>;
    const commandLoader = (agentYaml?.command_loader || {}) as Record<string, Record<string, unknown>>;
    const handoffTo = (agentYaml?.handoff_to || []) as Record<string, unknown>[];

    // Build commands list
    const commands: string[] = [];
    const rawCommands = agentYaml?.commands;
    if (rawCommands && typeof rawCommands === 'object' && !Array.isArray(rawCommands)) {
      for (const [cmd, desc] of Object.entries(rawCommands as Record<string, string>)) {
        commands.push(`*${cmd}: ${desc}`);
      }
    } else if (Array.isArray(rawCommands)) {
      for (const cmd of rawCommands) {
        if (typeof cmd === 'string') commands.push(cmd);
        else if (typeof cmd === 'object' && cmd !== null) {
          const c = cmd as Record<string, unknown>;
          commands.push(`*${c.name}: ${c.description || ''}`);
        }
      }
    }

    // Build tools list from dependencies and commands
    const tools: string[] = [];
    if (deps.tools) {
      tools.push(...deps.tools);
    }

    // Get task file names from dependencies or command_loader
    const taskFileNames = new Set<string>();
    if (deps.tasks) {
      for (const t of deps.tasks) {
        taskFileNames.add(t);
      }
    }
    for (const [, loader] of Object.entries(commandLoader)) {
      if (loader.task) {
        taskFileNames.add(loader.task as string);
      }
    }

    // Read squad.yaml (canonical source - no config.yaml fallback)
    let squadConfig: Record<string, unknown> | null = null;
    try {
      const content = await fs.readFile(path.join(squadDir, 'squad.yaml'), 'utf-8');
      squadConfig = yaml.load(content) as Record<string, unknown>;
    } catch {
      // squad.yaml not found or invalid - continue without it
    }

    // Find tasks associated with this agent from squad config
    if (squadConfig?.tasks && Array.isArray(squadConfig.tasks)) {
      for (const t of squadConfig.tasks) {
        if (typeof t === 'object' && t !== null) {
          const taskObj = t as Record<string, unknown>;
          // Add tasks that reference this agent
          if (taskObj.agent === normalizedAgentId || taskObj.id) {
            const taskFile = `${taskObj.id}.md`;
            taskFileNames.add(taskFile);
          }
        }
      }
    }

    // Parse task files (limit to first 15 to avoid excessive reads)
    const tasks: ParsedTask[] = [];
    const taskDir = path.join(squadDir, 'tasks');
    const taskFiles = [...taskFileNames].slice(0, 15);

    for (const taskFile of taskFiles) {
      const safeTaskRelative = sanitizeRelativePath(taskFile);
      const safeTaskPath = safeTaskRelative ? resolvePathWithin(taskDir, safeTaskRelative) : null;
      if (!safeTaskPath) {
        continue;
      }
      try {
        const content = await fs.readFile(safeTaskPath, 'utf-8');
        const taskId = taskFile.replace('.md', '');
        const parsed = parseTaskFile(content, taskId);
        // Only include tasks relevant to this agent or unassigned
        if (!parsed.agent || parsed.agent.includes(normalizedAgentId) || parsed.agent === '' || taskFileNames.has(taskFile)) {
          tasks.push(parsed);
        }
      } catch {
        // Task file doesn't exist, add a stub from squad config
        const taskId = taskFile.replace('.md', '');
        const configTask = squadConfig?.tasks && Array.isArray(squadConfig.tasks)
          ? (squadConfig.tasks as Record<string, unknown>[]).find((t) => (t as Record<string, unknown>).id === taskId)
          : null;
        if (configTask) {
          const ct = configTask as Record<string, unknown>;
            tasks.push({
              id: taskId,
              name: (ct.name as string) || formatName(taskId),
              description: (ct.description as string) || '',
              category: (ct.category as string) || '',
              agent: normalizedAgentId,
              inputs: [],
              outputs: [],
              responsibilities: [],
              antiPatterns: [],
              tools: [],
            estimatedDuration: '',
          });
        }
      }
    }

    // If no tasks from dependencies, scan task directory for any
    if (tasks.length === 0) {
      try {
        const entries = await fs.readdir(taskDir);
        const mdFiles = entries.filter((f) => f.endsWith('.md')).slice(0, 10);
        for (const file of mdFiles) {
          try {
            const content = await fs.readFile(path.join(taskDir, file), 'utf-8');
            tasks.push(parseTaskFile(content, file.replace('.md', '')));
          } catch {
            continue;
          }
        }
      } catch {
        // No tasks dir
      }
    }

    const principles = (agentYaml?.core_principles || []) as string[];

    const detail: AgentDetail = {
      id: normalizedAgentId,
      name: (agentData.name as string) || formatName(normalizedAgentId),
      title: (agentData.title as string) || (persona.role as string) || '',
      icon: (agentData.icon as string) || '',
      role: (persona.role as string) || '',
      tier: (agentData.tier as string) || '',
      description:
        (agentData.whenToUse as string) ||
        (persona.identity as string) ||
        '',
      principles: principles.slice(0, 8),
      tools,
      commands: commands.slice(0, 15),
      tasks,
      handoffs: handoffTo.map((h) => ({
        agent: (h.agent as string) || '',
        when: (h.when as string) || '',
        squad: h.squad as string | undefined,
      })),
      sourceMarkdown: agentContent,
      sourcePath: relativeAgentPath ? `agents/${relativeAgentPath}` : undefined,
    };

    return NextResponse.json({ agent: detail });
  } catch (error) {
    console.error('Error in /api/squads/[name]/agents/[agentId]:', error);
    return NextResponse.json(
      { error: 'Failed to load agent detail' },
      { status: 500 }
    );
  }
}
