import yaml from 'js-yaml';

/**
 * Agent color palette for Mermaid classDef styling.
 * Wraps around when more agents than colors.
 */
const AGENT_COLORS = [
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#9C27B0',
  '#F44336',
  '#00BCD4',
  '#795548',
];

/**
 * Sanitize a string to be a valid Mermaid node ID.
 * Only alphanumeric characters and underscores allowed.
 */
function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Sanitize a label for use inside Mermaid node brackets.
 * Escapes characters that would break Mermaid syntax.
 * Labels are wrapped in double quotes in formatNode, so " must be escaped first.
 */
function sanitizeLabel(raw: string): string {
  return raw
    .replace(/\\/g, '#bsol;')
    .replace(/"/g, '#quot;')
    .replace(/\[/g, '#lsqb;')
    .replace(/\]/g, '#rsqb;')
    .replace(/\{/g, '#lbrace;')
    .replace(/\}/g, '#rbrace;')
    .replace(/\(/g, '#lpar;')
    .replace(/\)/g, '#rpar;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
    .replace(/\|/g, '#vert;');
}

/**
 * Normalize an agent name for use as a Mermaid classDef identifier.
 * Replaces hyphens with underscores and prepends 'agent_'.
 */
function agentClassName(agent: string): string {
  return 'agent_' + agent.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '_');
}

interface MermaidNode {
  id: string;
  label: string;
  agent: string;
  shape: 'rectangle' | 'diamond' | 'hexagon';
}

interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
  dotted: boolean;
}

/**
 * Detect whether a phase/step should be rendered as a diamond (checkpoint with human_review).
 */
function isCheckpointNode(item: Record<string, unknown>): boolean {
  const cp = item.checkpoint as Record<string, unknown> | undefined;
  if (cp && cp.human_review === true) return true;
  return false;
}

/**
 * Detect whether a step should be rendered as a hexagon (elicit type).
 */
function isElicitNode(item: Record<string, unknown>): boolean {
  if (item.type === 'elicit') return true;
  // Some schemas have an elicit field as an object/array indicating elicitation
  if (item.elicit && typeof item.elicit === 'object') return true;
  return false;
}

/**
 * Extract the agent name from a phase/step entry.
 * Handles both string agent and nested agents.primary patterns.
 */
function extractAgent(item: Record<string, unknown>): string {
  if (typeof item.agent === 'string') {
    return item.agent.replace(/^@/, '');
  }
  const agents = item.agents as Record<string, unknown> | undefined;
  if (agents && typeof agents.primary === 'string') {
    return agents.primary.replace(/^@/, '');
  }
  return 'unknown';
}

/**
 * Determine the node shape based on phase/step properties.
 */
function determineShape(item: Record<string, unknown>): 'rectangle' | 'diamond' | 'hexagon' {
  if (isCheckpointNode(item)) return 'diamond';
  if (isElicitNode(item)) return 'hexagon';
  return 'rectangle';
}

/**
 * Format a Mermaid node definition string with the correct shape brackets.
 * Labels are wrapped in double quotes to safely handle special characters.
 * The <br/> line break is inserted AFTER sanitization to avoid being escaped.
 */
function formatNode(node: MermaidNode): string {
  const namePart = sanitizeLabel(node.label);
  const agentPart = sanitizeLabel(`@${node.agent}`);
  const label = `${namePart}<br/>${agentPart}`;
  switch (node.shape) {
    case 'diamond':
      return `  ${node.id}{"${label}"}`;
    case 'hexagon':
      return `  ${node.id}{{"${label}"}}`;
    case 'rectangle':
    default:
      return `  ${node.id}["${label}"]`;
  }
}

/**
 * Format a Mermaid edge definition string.
 */
function formatEdge(edge: MermaidEdge): string {
  const arrow = edge.dotted ? '-.->' : '-->';
  if (edge.label) {
    return `  ${edge.from} ${arrow}|${sanitizeLabel(edge.label)}| ${edge.to}`;
  }
  return `  ${edge.from} ${arrow} ${edge.to}`;
}

/**
 * Check if a transition condition string indicates a VETO or rejection path.
 */
function isVetoCondition(condition: string): boolean {
  const upper = condition.toUpperCase();
  return upper.includes('VETO') || upper.includes('NO-GO') || upper.includes('NO_GO');
}

/**
 * Process Style A workflows: top-level `phases` array with flat structure.
 * Used by advisory-board, copy, hormozi workflows.
 */
function processPhases(phases: Record<string, unknown>[]): { nodes: MermaidNode[]; edges: MermaidEdge[] } {
  const nodes: MermaidNode[] = [];
  const edges: MermaidEdge[] = [];

  for (const phase of phases) {
    const rawId = (phase.id || phase.name || `phase_${nodes.length}`) as string;
    const id = sanitizeId(rawId);
    const name = (phase.name || rawId) as string;
    const agent = extractAgent(phase);
    const shape = determineShape(phase);

    nodes.push({ id, label: name, agent, shape });

    // Process depends_on for edges
    const dependsOn = phase.depends_on as string | string[] | undefined;
    if (dependsOn) {
      const deps = Array.isArray(dependsOn) ? dependsOn : [dependsOn];
      for (const dep of deps) {
        // Filter out conditional depends_on like "step_0_0.decision == 'proceed'"
        const cleanDep = dep.split('.')[0];
        edges.push({
          from: sanitizeId(cleanDep),
          to: id,
          dotted: false,
        });
      }
    }

    // Also process nested steps within phases (hybrid Style A+B like wf-create-squad)
    const steps = phase.steps as Record<string, unknown>[] | undefined;
    if (steps && Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepRawId = (step.id || `${rawId}_step_${i}`) as string;
        const stepId = sanitizeId(stepRawId);
        const stepName = (step.name || stepRawId) as string;
        const stepAgent = extractAgent(step) !== 'unknown' ? extractAgent(step) : agent;
        const stepShape = determineShape(step);

        nodes.push({ id: stepId, label: stepName, agent: stepAgent, shape: stepShape });

        // Step-level depends_on
        const stepDeps = step.depends_on as string | string[] | undefined;
        if (stepDeps) {
          const deps = Array.isArray(stepDeps) ? stepDeps : [stepDeps];
          for (const dep of deps) {
            const cleanDep = dep.split('.')[0];
            edges.push({
              from: sanitizeId(cleanDep),
              to: stepId,
              dotted: false,
            });
          }
        } else if (i === 0) {
          // First step connects from parent phase concept -- skip, we will handle sequential below
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Process Style B workflows: top-level `steps` array (or `workflow.steps`).
 * Used by design brownfield workflow.
 */
function processSteps(steps: Record<string, unknown>[]): { nodes: MermaidNode[]; edges: MermaidEdge[] } {
  const nodes: MermaidNode[] = [];
  const edges: MermaidEdge[] = [];

  for (const step of steps) {
    const rawId = (step.id || `step_${nodes.length}`) as string;
    const id = sanitizeId(rawId);
    const name = (step.name || rawId) as string;
    const agent = extractAgent(step);
    const shape = determineShape(step);

    nodes.push({ id, label: name, agent, shape });
  }

  return { nodes, edges };
}

/**
 * Process explicit transitions block.
 * Used by wf-create-squad.yaml.
 */
function processTransitions(
  transitions: Record<string, unknown>[],
  nodeIds: Set<string>
): MermaidEdge[] {
  const edges: MermaidEdge[] = [];

  for (const t of transitions) {
    const from = sanitizeId((t.from || '') as string);
    const to = sanitizeId((t.to || '') as string);
    const condition = (t.condition || t.description || '') as string;

    // Only add edges between nodes that exist in our graph
    if (!nodeIds.has(from) || !nodeIds.has(to)) continue;

    const dotted = isVetoCondition(condition);
    edges.push({ from, to, label: condition || undefined, dotted });
  }

  return edges;
}

/**
 * Add sequential edges as fallback for nodes that have no incoming edges.
 * This ensures the diagram is connected even when depends_on/transitions are absent.
 */
function addSequentialFallback(nodes: MermaidNode[], edges: MermaidEdge[]): MermaidEdge[] {
  const nodesWithIncoming = new Set<string>();
  for (const edge of edges) {
    nodesWithIncoming.add(edge.to);
  }

  const sequentialEdges: MermaidEdge[] = [];
  for (let i = 1; i < nodes.length; i++) {
    if (!nodesWithIncoming.has(nodes[i].id)) {
      sequentialEdges.push({
        from: nodes[i - 1].id,
        to: nodes[i].id,
        dotted: false,
      });
      nodesWithIncoming.add(nodes[i].id);
    }
  }

  return sequentialEdges;
}

/**
 * Generate classDef declarations and class assignments for agent coloring.
 */
function generateAgentStyles(nodes: MermaidNode[]): { classDefs: string[]; classAssignments: string[] } {
  const agentMap = new Map<string, string[]>();

  for (const node of nodes) {
    const existing = agentMap.get(node.agent) || [];
    existing.push(node.id);
    agentMap.set(node.agent, existing);
  }

  const classDefs: string[] = [];
  const classAssignments: string[] = [];
  let colorIdx = 0;

  for (const [agent, nodeIds] of agentMap) {
    const color = AGENT_COLORS[colorIdx % AGENT_COLORS.length];
    const className = agentClassName(agent);
    classDefs.push(`  classDef ${className} fill:${color},stroke:${color},color:#fff`);
    classAssignments.push(`  class ${nodeIds.join(',')} ${className}`);
    colorIdx++;
  }

  return { classDefs, classAssignments };
}

/**
 * Metadata extracted from a workflow YAML for rendering header/legend.
 */
export interface WorkflowMeta {
  name: string;
  version: string | null;
  phaseCount: number;
  agents: { name: string; color: string }[];
}

/**
 * Extract display metadata from a workflow YAML string.
 * Safe — never throws; returns sensible defaults on failure.
 */
export function extractWorkflowMeta(yamlContent: string): WorkflowMeta {
  const fallback: WorkflowMeta = { name: 'Workflow', version: null, phaseCount: 0, agents: [] };

  try {
    const data = yaml.load(yamlContent) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') return fallback;

    const meta = (data.metadata ?? data) as Record<string, unknown>;
    const name = (meta.name ?? meta.workflow_name ?? 'Workflow') as string;
    const version = (meta.version ?? null) as string | null;

    const rawPhases = data.phases as unknown[] | undefined;
    const rawSteps = data.steps as unknown[] | undefined;
    const workflowObj = data.workflow as Record<string, unknown> | undefined;
    const workflowSteps = workflowObj?.steps as unknown[] | undefined;

    const items = rawPhases ?? rawSteps ?? workflowSteps ?? [];
    const phaseCount = Array.isArray(items) ? items.length : 0;

    // Collect unique agents
    const agentSet = new Map<string, string>();
    let colorIdx = 0;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && typeof item === 'object') {
          const agent = extractAgent(item as Record<string, unknown>);
          if (agent !== 'unknown' && !agentSet.has(agent)) {
            agentSet.set(agent, AGENT_COLORS[colorIdx % AGENT_COLORS.length]);
            colorIdx++;
          }
        }
      }
    }

    const agents = Array.from(agentSet.entries()).map(([n, c]) => ({ name: n, color: c }));

    return { name, version, phaseCount, agents };
  } catch {
    return fallback;
  }
}

/**
 * Convert a workflow YAML string to a Mermaid flowchart definition string.
 *
 * Supports two main schema styles:
 * - Style A: Top-level `phases` array (advisory-board, copy, hormozi)
 * - Style B: Top-level `steps` or `workflow.steps` array (design brownfield)
 *
 * Also handles:
 * - Explicit `transitions` blocks (squad-creator)
 * - `depends_on` references on phases/steps
 * - Sequential fallback when no dependency info exists
 * - Checkpoint diamonds (`human_review: true`)
 * - Elicit hexagons (`type: elicit` or `elicit` field)
 * - VETO/NO-GO dotted edges
 * - Per-agent color coding via classDef
 *
 * @param yamlContent - Raw YAML string of a workflow file
 * @returns Mermaid flowchart TD string
 * @throws Error if YAML cannot be parsed
 */
export function yamlToMermaid(yamlContent: string): string {
  if (!yamlContent || !yamlContent.trim()) {
    throw new Error('Empty or null YAML content provided');
  }

  let data: Record<string, unknown>;
  try {
    data = yaml.load(yamlContent) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Failed to parse YAML: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('YAML content does not contain a valid object');
  }

  // Detect schema style and extract phases/steps
  const rawPhases = data.phases as Record<string, unknown>[] | undefined;
  const rawSteps = data.steps as Record<string, unknown>[] | undefined;
  const workflowObj = data.workflow as Record<string, unknown> | undefined;
  const workflowSteps = workflowObj?.steps as Record<string, unknown>[] | undefined;
  const rawTransitions = data.transitions as Record<string, unknown>[] | undefined;

  let nodes: MermaidNode[] = [];
  let edges: MermaidEdge[] = [];

  if (rawPhases && Array.isArray(rawPhases) && rawPhases.length > 0) {
    // Style A: flat phases (may also contain nested steps)
    const result = processPhases(rawPhases);
    nodes = result.nodes;
    edges = result.edges;
  } else if (rawSteps && Array.isArray(rawSteps) && rawSteps.length > 0) {
    // Style B: top-level steps
    const result = processSteps(rawSteps);
    nodes = result.nodes;
    edges = result.edges;
  } else if (workflowSteps && Array.isArray(workflowSteps) && workflowSteps.length > 0) {
    // Style B nested: workflow.steps
    const result = processSteps(workflowSteps);
    nodes = result.nodes;
    edges = result.edges;
  } else {
    throw new Error('No phases or steps found in YAML content');
  }

  if (nodes.length === 0) {
    throw new Error('No nodes could be extracted from the workflow');
  }

  // Process explicit transitions if present
  const nodeIds = new Set(nodes.map((n) => n.id));
  if (rawTransitions && Array.isArray(rawTransitions) && rawTransitions.length > 0) {
    const transEdges = processTransitions(rawTransitions, nodeIds);
    edges.push(...transEdges);
  }

  // Add sequential fallback for disconnected nodes
  const sequentialEdges = addSequentialFallback(nodes, edges);
  edges.push(...sequentialEdges);

  // Deduplicate edges
  const edgeSet = new Set<string>();
  const uniqueEdges: MermaidEdge[] = [];
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}:${edge.label || ''}:${edge.dotted}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      uniqueEdges.push(edge);
    }
  }

  // Generate agent styles
  const { classDefs, classAssignments } = generateAgentStyles(nodes);

  // Build Mermaid output
  const lines: string[] = ['flowchart TD'];

  // Node definitions
  for (const node of nodes) {
    lines.push(formatNode(node));
  }

  // Edge definitions
  lines.push('');
  for (const edge of uniqueEdges) {
    lines.push(formatEdge(edge));
  }

  // Style definitions
  if (classDefs.length > 0) {
    lines.push('');
    for (const def of classDefs) {
      lines.push(def);
    }
    for (const assignment of classAssignments) {
      lines.push(assignment);
    }
  }

  return lines.join('\n');
}
