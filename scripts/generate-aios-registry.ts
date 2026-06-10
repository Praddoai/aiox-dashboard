/**
 * AIOS Registry Generator
 *
 * Parses agent, task, workflow, and checklist definitions from .aios-core/
 * and outputs a typed TypeScript registry file.
 *
 * Run: npx tsx scripts/generate-aios-registry.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

// .aios-core candidates (legacy/ after repo restructure, or parent dirs)
const AIOS_CORE_CANDIDATES = [
  path.resolve(PROJECT_ROOT, 'legacy/.aios-core'),
  path.resolve(PROJECT_ROOT, '../../.aios-core'),
  path.resolve(PROJECT_ROOT, '../../../.aios-core'),
  path.resolve(PROJECT_ROOT, '../.aios-core'),
];

function findAiosCore(): string {
  for (const candidate of AIOS_CORE_CANDIDATES) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  console.error('ERROR: Could not find .aios-core directory. Tried:');
  AIOS_CORE_CANDIDATES.forEach((c) => console.error(`  - ${c}`));
  process.exit(1);
}

const AIOS_CORE = findAiosCore();
const DEV_ROOT = path.join(AIOS_CORE, 'development');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'src/data/aios-registry.generated.ts');

console.log(`[registry] AIOS Core: ${AIOS_CORE}`);
console.log(`[registry] Output:    ${OUTPUT_FILE}`);

// ---------------------------------------------------------------------------
// Minimal YAML parser (handles the subset used in agent files)
// ---------------------------------------------------------------------------

/**
 * Extract YAML content from a code-fenced block inside a markdown file.
 * Agent files embed their YAML definition inside ```yaml ... ``` blocks.
 */
function extractYamlFromMarkdown(content: string): string | null {
  const match = content.match(/```yaml\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

/**
 * Very simple YAML value parser - handles strings, arrays inline, booleans, numbers.
 * This is NOT a full YAML parser - just enough for the fields we need.
 */
function parseSimpleYamlValue(raw: string): string | boolean | number | string[] {
  const trimmed = raw.trim();

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === '~') return '';

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  // Inline array: [a, b, c]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
  }

  // Quoted string
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

// ---------------------------------------------------------------------------
// Agent parser
// ---------------------------------------------------------------------------

interface RawAgentData {
  id: string;
  name: string;
  title: string;
  icon: string;
  archetype: string;
  zodiac: string;
  role: string;
  tone: string;
  whenToUse: string;
  commands: Array<{
    name: string;
    description: string;
    visibility: string[];
    args?: string;
  }>;
  tools: string[];
  exclusiveOps: string[];
  delegatesTo: string[];
  receivesFrom: string[];
  dependencyTasks: string[];
  dependencyTemplates: string[];
  dependencyChecklists: string[];
}

function parseAgentFile(filePath: string): RawAgentData | null {
  const filename = path.basename(filePath, '.md');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const yaml = extractYamlFromMarkdown(content);
    if (!yaml) {
      console.warn(`[registry] WARN: No YAML block found in ${filename}.md`);
      return null;
    }

    // Extract agent identity
    const agentId = extractField(yaml, 'id') || filename;
    const agentName = extractField(yaml, 'name', 'agent') || filename;
    const title = extractField(yaml, 'title', 'agent') || '';
    const icon = extractField(yaml, 'icon', 'agent') || '';
    const whenToUse = extractMultilineField(yaml, 'whenToUse', 'agent') || '';

    // Persona profile
    const archetype = extractField(yaml, 'archetype', 'persona_profile') || '';
    const zodiac = extractField(yaml, 'zodiac', 'persona_profile') || '';
    const tone = extractField(yaml, 'tone', 'communication') || '';
    const role = extractField(yaml, 'role', 'persona') || '';

    // Commands
    const commands = parseCommands(yaml);

    // Tools
    const tools = parseListSection(yaml, 'tools');

    // Exclusive ops
    const exclusiveOps = parseExclusiveOps(yaml);

    // Dependencies
    const dependencyTasks = parseListSection(yaml, 'tasks', 'dependencies');
    const dependencyTemplates = parseListSection(yaml, 'templates', 'dependencies');
    const dependencyChecklists = parseListSection(yaml, 'checklists', 'dependencies');

    // Delegation (from markdown sections)
    const delegatesTo = parseDelegation(content, 'delegate');
    const receivesFrom = parseDelegation(content, 'receive');

    return {
      id: String(agentId),
      name: String(agentName),
      title: String(title),
      icon: String(icon),
      archetype: String(archetype),
      zodiac: String(zodiac),
      role: String(role),
      tone: String(tone),
      whenToUse: String(whenToUse),
      commands,
      tools,
      exclusiveOps,
      delegatesTo,
      receivesFrom,
      dependencyTasks,
      dependencyTemplates,
      dependencyChecklists,
    };
  } catch (err) {
    console.warn(`[registry] WARN: Failed to parse ${filePath}: ${err}`);
    return null;
  }
}

function extractField(yaml: string, field: string, parent?: string): string | null {
  // Try to find field in context of parent, or globally
  const lines = yaml.split('\n');
  let inParent = !parent;
  let parentIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (parent && !inParent) {
      // Look for parent key
      if (trimmed.startsWith(`${parent}:`) || trimmed.startsWith(`${parent} :`)) {
        inParent = true;
        parentIndent = indent;
        continue;
      }
    }

    if (inParent) {
      // If we're back at parent indent level or less with a new key, we've left the parent
      if (parent && indent <= parentIndent && trimmed.length > 0 && !trimmed.startsWith('#') && i > 0) {
        // Check if this is actually a sibling key
        const isKey = /^[a-zA-Z_-]+\s*:/.test(trimmed);
        if (isKey && indent <= parentIndent) {
          inParent = false;
          continue;
        }
      }

      // Look for the field
      const fieldPattern = new RegExp(`^\\s*${field}\\s*:\\s*(.*)$`);
      const match = trimmed.match(fieldPattern);
      if (match) {
        const value = match[1].trim();
        if (value === '|' || value === '>-' || value === '>') {
          // Multi-line value - collect subsequent indented lines
          const parts: string[] = [];
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trimStart();
            const nextIndent = nextLine.length - nextTrimmed.length;
            if (nextIndent > indent + 2 || (nextTrimmed.length === 0 && parts.length > 0)) {
              parts.push(nextTrimmed);
            } else if (nextTrimmed.length > 0 && nextIndent <= indent + 2) {
              break;
            }
          }
          return parts.join(' ').trim();
        }
        // Remove quotes
        const cleaned = value.replace(/^['"]|['"]$/g, '');
        return cleaned || null;
      }
    }
  }

  // Fallback: global search without parent context
  if (parent) {
    return extractField(yaml, field);
  }

  return null;
}

function extractMultilineField(yaml: string, field: string, parent?: string): string | null {
  const lines = yaml.split('\n');
  let inParent = !parent;
  let _parentIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (parent && !inParent) {
      if (trimmed.startsWith(`${parent}:`)) {
        inParent = true;
        _parentIndent = indent;
        continue;
      }
    }

    if (inParent) {
      const fieldPattern = new RegExp(`^${field}\\s*:\\s*(.*)$`);
      const match = trimmed.match(fieldPattern);
      if (match) {
        const value = match[1].trim();
        if (value === '|' || value === '>-' || value === '>' || value === '|-') {
          const parts: string[] = [];
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trimStart();
            const nextIndent = nextLine.length - nextTrimmed.length;
            if (nextIndent > indent && nextTrimmed.length > 0) {
              parts.push(nextTrimmed);
            } else if (nextTrimmed.length === 0) {
              continue;
            } else {
              break;
            }
          }
          return parts.join(' ').trim();
        }
        return value.replace(/^['"]|['"]$/g, '') || null;
      }
    }
  }

  return extractField(yaml, field, parent);
}

function parseCommands(yaml: string): RawAgentData['commands'] {
  const commands: RawAgentData['commands'] = [];
  const lines = yaml.split('\n');

  let inCommands = false;
  let commandsIndent = -1;
  let currentCommand: Partial<RawAgentData['commands'][0]> | null = null;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (trimmed.startsWith('commands:')) {
      inCommands = true;
      commandsIndent = indent;
      continue;
    }

    if (inCommands) {
      // Skip comments and blank lines
      if (trimmed.startsWith('#') || trimmed.length === 0) continue;

      // End of commands section: a key at same or lower indent that is not a command entry
      if (indent <= commandsIndent && !trimmed.startsWith('-') && /^[a-zA-Z_]/.test(trimmed)) {
        if (currentCommand?.name) {
          commands.push({
            name: currentCommand.name,
            description: currentCommand.description || '',
            visibility: currentCommand.visibility || [],
            args: currentCommand.args,
          });
          currentCommand = null;
        }
        inCommands = false;
        continue;
      }

      // Format A: structured list with `- name: xxx` + description/visibility/args on next lines
      if (trimmed.startsWith('- name:')) {
        if (currentCommand?.name) {
          commands.push({
            name: currentCommand.name,
            description: currentCommand.description || '',
            visibility: currentCommand.visibility || [],
            args: currentCommand.args,
          });
        }
        currentCommand = {
          name: trimmed.replace('- name:', '').trim(),
        };
        continue;
      }

      // Sub-fields of a structured command
      if (currentCommand && (trimmed.startsWith('description:') || trimmed.startsWith('visibility:') || trimmed.startsWith('args:'))) {
        if (trimmed.startsWith('description:')) {
          currentCommand.description = String(
            parseSimpleYamlValue(trimmed.replace('description:', '').trim())
          );
        } else if (trimmed.startsWith('visibility:')) {
          const val = parseSimpleYamlValue(trimmed.replace('visibility:', '').trim());
          currentCommand.visibility = Array.isArray(val) ? val : [String(val)];
        } else if (trimmed.startsWith('args:')) {
          currentCommand.args = String(
            parseSimpleYamlValue(trimmed.replace('args:', '').trim())
          );
        }
        continue;
      }

      // Format B: shorthand `- key: description` (used by data-engineer, etc.)
      const shorthandDash = trimmed.match(/^- ([a-zA-Z_-]+(?:\s+\{[^}]+\})?)\s*:\s*(.+)$/);
      if (shorthandDash) {
        if (currentCommand?.name) {
          commands.push({
            name: currentCommand.name,
            description: currentCommand.description || '',
            visibility: currentCommand.visibility || [],
            args: currentCommand.args,
          });
          currentCommand = null;
        }
        const rawName = shorthandDash[1].trim();
        const desc = shorthandDash[2].trim().replace(/^['"]|['"]$/g, '');
        // Separate command name from args pattern (e.g. "apply-migration {path}")
        const argMatch = rawName.match(/^([a-zA-Z_-]+)\s+(\{.+\})$/);
        commands.push({
          name: argMatch ? argMatch[1] : rawName,
          description: desc,
          visibility: ['full'],
          args: argMatch ? argMatch[2] : undefined,
        });
        continue;
      }

      // Format C: shorthand without dash `key {args}: 'description'` (used by ux-design-expert)
      const shorthandNoDash = trimmed.match(/^([a-zA-Z_-]+(?:\s+\{[^}]+\})?)\s*:\s*['"]?(.+?)['"]?\s*$/);
      if (shorthandNoDash && !trimmed.startsWith('name:') && !trimmed.startsWith('description:') && !trimmed.startsWith('visibility:') && !trimmed.startsWith('args:')) {
        if (currentCommand?.name) {
          commands.push({
            name: currentCommand.name,
            description: currentCommand.description || '',
            visibility: currentCommand.visibility || [],
            args: currentCommand.args,
          });
          currentCommand = null;
        }
        const rawName = shorthandNoDash[1].trim();
        const desc = shorthandNoDash[2].trim().replace(/^['"]|['"]$/g, '');
        const argMatch = rawName.match(/^([a-zA-Z_-]+)\s+(\{.+\})$/);
        commands.push({
          name: argMatch ? argMatch[1] : rawName,
          description: desc,
          visibility: ['full'],
          args: argMatch ? argMatch[2] : undefined,
        });
        continue;
      }
    }
  }

  // Push last command
  if (currentCommand?.name) {
    commands.push({
      name: currentCommand.name,
      description: currentCommand.description || '',
      visibility: currentCommand.visibility || [],
      args: currentCommand.args,
    });
  }

  return commands;
}

function parseListSection(yaml: string, section: string, parent?: string): string[] {
  const items: string[] = [];
  const lines = yaml.split('\n');

  let inParent = !parent;
  let inSection = false;
  let sectionIndent = -1;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (parent && !inParent) {
      if (trimmed.startsWith(`${parent}:`)) {
        inParent = true;
        continue;
      }
    }

    if (inParent && !inSection) {
      if (trimmed.startsWith(`${section}:`)) {
        inSection = true;
        sectionIndent = indent;
        continue;
      }
    }

    if (inSection) {
      // End of section
      if (indent <= sectionIndent && trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
        break;
      }

      if (trimmed.startsWith('- ')) {
        let item = trimmed.slice(2).trim();
        // Remove inline comments
        const commentIdx = item.indexOf(' #');
        if (commentIdx > 0) {
          item = item.slice(0, commentIdx).trim();
        }
        // Remove quotes
        item = item.replace(/^['"]|['"]$/g, '');
        if (item) {
          items.push(item);
        }
      }
    }
  }

  return items;
}

function parseExclusiveOps(yaml: string): string[] {
  const ops: string[] = [];
  const lines = yaml.split('\n');

  let inExclusive = false;

  for (const line of lines) {
    const trimmed = line.trimStart();

    if (
      trimmed.startsWith('exclusive_operations:') ||
      trimmed.startsWith('exclusive_authority:') ||
      trimmed.startsWith('blocked_operations:')
    ) {
      inExclusive = true;
      continue;
    }

    if (inExclusive) {
      if (trimmed.startsWith('- ')) {
        let item = trimmed.slice(2).trim();
        const commentIdx = item.indexOf(' #');
        if (commentIdx > 0) {
          item = item.slice(0, commentIdx).trim();
        }
        ops.push(item);
      } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        inExclusive = false;
      }
    }
  }

  return ops;
}

function parseDelegation(content: string, type: 'delegate' | 'receive'): string[] {
  const agents: string[] = [];

  if (type === 'delegate') {
    // Look for "I delegate to:" section or delegation mentions
    const delegateMatch = content.match(/I delegate to:[\s\S]*?(?=\n##|\n---|\n\*\*When)/i);
    if (delegateMatch) {
      const agentRefs = delegateMatch[0].matchAll(/@(\w[\w-]*)/g);
      for (const m of agentRefs) {
        if (!agents.includes(m[1])) agents.push(m[1]);
      }
    }
  } else {
    // Look for "I receive delegation from:" or "I collaborate with:"
    const receiveMatch = content.match(
      /(?:I receive delegation from|I collaborate with):[\s\S]*?(?=\n##|\n---|\n\*\*When)/i
    );
    if (receiveMatch) {
      const agentRefs = receiveMatch[0].matchAll(/@(\w[\w-]*)/g);
      for (const m of agentRefs) {
        if (!agents.includes(m[1])) agents.push(m[1]);
      }
    }
  }

  return agents;
}

// ---------------------------------------------------------------------------
// Task parser
// ---------------------------------------------------------------------------

interface RawTaskData {
  id: string;
  taskName: string;
  description: string;
  agent: string;
  hasElicitation: boolean;
}

function parseTaskFile(filePath: string): RawTaskData | null {
  const filename = path.basename(filePath, '.md');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Get title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const description = titleMatch ? titleMatch[1].trim() : filename;

    // Try to extract task name from YAML block
    const yaml = extractYamlFromMarkdown(content);
    let taskName = '';
    let agent = '';
    let hasElicitation = false;

    if (yaml) {
      const taskNameMatch = yaml.match(/task:\s*(\S+)/);
      taskName = taskNameMatch ? taskNameMatch[1] : '';

      const agentMatch = yaml.match(/responsável:\s*(\w+)/i) || yaml.match(/agent:\s*(\w+)/i);
      agent = agentMatch ? agentMatch[1] : '';

      hasElicitation = /elicit:\s*true/i.test(yaml) || /elicit:\s*true/i.test(content);
    }

    // Check for elicitation markers in the full content
    if (!hasElicitation) {
      hasElicitation =
        content.includes('elicit: true') ||
        content.includes('elicit=true') ||
        content.includes('Interactive Mode');
    }

    return {
      id: filename,
      taskName: taskName || `${filename}()`,
      description,
      agent,
      hasElicitation,
    };
  } catch (err) {
    console.warn(`[registry] WARN: Failed to parse task ${filePath}: ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Workflow parser (YAML files)
// ---------------------------------------------------------------------------

interface RawWorkflowData {
  id: string;
  name: string;
  description: string;
  type: string;
  phases: Array<{
    id: string;
    name: string;
    phase: string | number;
    agent: string;
    taskFile?: string;
  }>;
  agents: string[];
  triggers: string[];
}

function parseWorkflowFile(filePath: string): RawWorkflowData | null {
  const filename = path.basename(filePath, '.yaml');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract top-level workflow fields
    const idMatch = content.match(/^\s+id:\s*(.+)$/m);
    const nameMatch = content.match(/^\s+name:\s*["']?(.+?)["']?\s*$/m);
    const descMatch = content.match(/^\s+description:\s*>-?\n([\s\S]*?)(?=\n\s+\w+:)/m);
    const typeMatch = content.match(/^\s+type:\s*(.+)$/m);

    const id = idMatch ? idMatch[1].trim() : filename;
    const name = nameMatch ? nameMatch[1].trim() : filename;
    const description = descMatch
      ? descMatch[1]
          .split('\n')
          .map((l: string) => l.trim())
          .filter(Boolean)
          .join(' ')
      : '';
    const type = typeMatch ? typeMatch[1].trim() : 'generic';

    // Extract phases from sequence
    const phases: RawWorkflowData['phases'] = [];
    const agentSet = new Set<string>();

    // Parse sequence steps
    const stepMatches = content.matchAll(
      /- step:\s*(\S+)[\s\S]*?phase:\s*["']?(\S+?)["']?\s*\n[\s\S]*?(?:phase_name:\s*["']?(.+?)["']?\s*\n)?[\s\S]*?agent:\s*(\S+)/g
    );

    for (const match of stepMatches) {
      const stepId = match[1];
      const phase = match[2];
      const phaseName = match[3] || stepId;
      const agent = match[4];

      // Try to find task file for this step
      const stepBlock = content.substring(
        match.index!,
        Math.min(match.index! + 500, content.length)
      );
      const taskMatch = stepBlock.match(/task:\s*(\S+\.md)/);

      phases.push({
        id: stepId,
        name: phaseName,
        phase,
        agent,
        taskFile: taskMatch ? taskMatch[1] : undefined,
      });

      if (agent !== 'system') {
        agentSet.add(agent);
      }
    }

    // Also parse phases from simpler format (phase_1, phase_2, etc.)
    if (phases.length === 0) {
      const phaseListMatches = content.matchAll(
        /- phase_(\d+):\s*(.+)/g
      );
      for (const match of phaseListMatches) {
        phases.push({
          id: `phase_${match[1]}`,
          name: match[2].trim(),
          phase: match[1],
          agent: '',
        });
      }

      // Try to get agents from sequence with simpler format
      const seqAgentMatches = content.matchAll(/agent:\s*(\w+)/g);
      for (const m of seqAgentMatches) {
        if (m[1] !== 'system') agentSet.add(m[1]);
      }
    }

    // Extract triggers
    const triggers: string[] = [];
    const triggerMatches = content.matchAll(/command:\s*["']?(\*\S+)["']?/g);
    for (const m of triggerMatches) {
      triggers.push(m[1]);
    }

    return {
      id,
      name,
      description,
      type,
      phases,
      agents: Array.from(agentSet),
      triggers,
    };
  } catch (err) {
    console.warn(`[registry] WARN: Failed to parse workflow ${filePath}: ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Checklist parser
// ---------------------------------------------------------------------------

interface RawChecklistData {
  id: string;
  name: string;
  description: string;
  itemCount: number;
}

function parseChecklistFile(filePath: string): RawChecklistData | null {
  const filename = path.basename(filePath, '.md');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Get name from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const name = titleMatch ? titleMatch[1].trim() : filename;

    // Get description from purpose section or YAML
    let description = '';
    const purposeMatch = content.match(/## Purpose\s*\n\s*([\s\S]*?)(?=\n##|\n---)/);
    if (purposeMatch) {
      description = purposeMatch[1].trim().split('\n')[0];
    } else {
      const yaml = extractYamlFromMarkdown(content);
      if (yaml) {
        const purposeField = extractField(yaml, 'purpose');
        description = purposeField || '';
      }
    }

    // Count checklist items (- [ ] or - [x] patterns, plus yaml check items)
    const checkboxes = (content.match(/- \[[ x]\]/g) || []).length;
    const yamlChecks = (content.match(/- id:\s/g) || []).length;
    const itemCount = Math.max(checkboxes, yamlChecks);

    return {
      id: filename,
      name,
      description: String(description),
      itemCount,
    };
  } catch (err) {
    console.warn(`[registry] WARN: Failed to parse checklist ${filePath}: ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// File scanning helpers
// ---------------------------------------------------------------------------

function listFiles(dir: string, ext: string): string[] {
  try {
    if (!fs.existsSync(dir)) {
      console.warn(`[registry] WARN: Directory not found: ${dir}`);
      return [];
    }
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(ext) && !f.startsWith('.') && f !== 'README.md')
      .map((f) => path.join(dir, f));
  } catch (err) {
    console.warn(`[registry] WARN: Failed to list ${dir}: ${err}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------

function generate(): void {
  console.log('[registry] Starting AIOS Registry generation...\n');

  // --- Agents ---
  const agentsDir = path.join(DEV_ROOT, 'agents');
  const agentFiles = listFiles(agentsDir, '.md');
  console.log(`[registry] Found ${agentFiles.length} agent files`);

  const agents: RawAgentData[] = [];
  for (const file of agentFiles) {
    const agent = parseAgentFile(file);
    if (agent) {
      agents.push(agent);
      console.log(`  ✓ ${agent.id} (${agent.name}) — ${agent.commands.length} commands, ${agent.tools.length} tools`);
    }
  }

  // --- Tasks ---
  const tasksDir = path.join(DEV_ROOT, 'tasks');
  const taskFiles = listFiles(tasksDir, '.md');
  console.log(`\n[registry] Found ${taskFiles.length} task files`);

  const tasks: RawTaskData[] = [];
  for (const file of taskFiles) {
    const task = parseTaskFile(file);
    if (task) {
      tasks.push(task);
    }
  }
  console.log(`  ✓ Parsed ${tasks.length} tasks (${tasks.filter((t) => t.hasElicitation).length} with elicitation)`);

  // --- Workflows ---
  const workflowsDir = path.join(DEV_ROOT, 'workflows');
  const workflowFiles = listFiles(workflowsDir, '.yaml');
  console.log(`\n[registry] Found ${workflowFiles.length} workflow files`);

  const workflows: RawWorkflowData[] = [];
  for (const file of workflowFiles) {
    const wf = parseWorkflowFile(file);
    if (wf) {
      workflows.push(wf);
      console.log(`  ✓ ${wf.id} — ${wf.phases.length} phases, ${wf.agents.length} agents`);
    }
  }

  // --- Checklists ---
  const checklistsDir = path.join(DEV_ROOT, 'checklists');
  const checklistFiles = listFiles(checklistsDir, '.md');
  console.log(`\n[registry] Found ${checklistFiles.length} checklist files`);

  const checklists: RawChecklistData[] = [];
  for (const file of checklistFiles) {
    const cl = parseChecklistFile(file);
    if (cl) {
      checklists.push(cl);
      console.log(`  ✓ ${cl.id} — ${cl.itemCount} items`);
    }
  }

  // --- Build output ---
  const registryObject = {
    agents,
    tasks,
    workflows,
    checklists,
    meta: {
      agentCount: agents.length,
      taskCount: tasks.length,
      workflowCount: workflows.length,
      checklistCount: checklists.length,
    },
  };

  const output = `// AUTO-GENERATED — do not edit manually
// Run: npx tsx scripts/generate-aios-registry.ts

import type { AIOSRegistry } from './registry-types';

export const aiosRegistry: AIOSRegistry = ${JSON.stringify(registryObject, null, 2)} as const;

// Convenience lookups
export const agentById = new Map(aiosRegistry.agents.map(a => [a.id, a]));
export const taskById = new Map(aiosRegistry.tasks.map(t => [t.id, t]));
export const workflowById = new Map(aiosRegistry.workflows.map(w => [w.id, w]));
export const checklistById = new Map(aiosRegistry.checklists.map(c => [c.id, c]));

// Agent IDs as union type for type safety
export type AgentId = typeof aiosRegistry.agents[number]['id'];
export type WorkflowId = typeof aiosRegistry.workflows[number]['id'];
`;

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  console.log(`\n[registry] Registry generated successfully!`);
  console.log(`[registry] Output: ${OUTPUT_FILE}`);
  console.log(`[registry] Stats:`);
  console.log(`  Agents:     ${agents.length}`);
  console.log(`  Tasks:      ${tasks.length}`);
  console.log(`  Workflows:  ${workflows.length}`);
  console.log(`  Checklists: ${checklists.length}`);
}

generate();
