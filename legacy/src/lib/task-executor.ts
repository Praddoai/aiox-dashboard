/**
 * Background task executor — fire-and-forget.
 *
 * Flow:
 * 1. Planning: spawns Claude CLI to analyze demand and produce a structured ExecutionPlan
 * 2. Awaiting approval: pauses, pushes plan to frontend via SSE
 * 3. Execution: after approval, executes each plan step sequentially (multi-agent)
 *
 * All events are pushed to the task store's event buffer via pushEvent().
 * SSE clients subscribe to the buffer for live updates.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import yaml from 'js-yaml';
import { getTask, updateTask, pushEvent } from './task-store';
import type { ExecutionPlan, ExecutionPlanStep } from './task-store';
import { getProjectRoot, formatName } from './squad-api-utils';
import { persistTask } from './task-persistence';

// ---------------------------------------------------------------------------
// Squad discovery
// ---------------------------------------------------------------------------

interface SquadCandidate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  agentNames: string[];
}

async function loadSquadCandidates(): Promise<SquadCandidate[]> {
  const projectRoot = getProjectRoot();
  const registryPath = path.join(projectRoot, 'squads', 'squad-creator', 'data', 'squad-registry.yaml');

  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    const registry = yaml.load(content) as {
      squads?: Record<string, {
        description?: string;
        keywords?: string[];
        agent_names?: string[];
      }>;
    };

    if (!registry?.squads) return [];

    return Object.entries(registry.squads).map(([id, data]) => ({
      id,
      name: formatName(id),
      description: data.description || '',
      keywords: data.keywords || [],
      agentNames: data.agent_names || [],
    }));
  } catch {
    // Fallback: scan squads directory
    const squadsDir = path.join(projectRoot, 'squads');
    const candidates: SquadCandidate[] = [];

    try {
      const entries = await fs.readdir(squadsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const squadDir = path.join(squadsDir, entry.name);
        let description = '';
        let keywords: string[] = [];

        for (const configFile of ['squad.yaml', 'config.yaml']) {
          try {
            const raw = await fs.readFile(path.join(squadDir, configFile), 'utf-8');
            const config = yaml.load(raw) as Record<string, unknown>;
            description = (config.description as string) || '';
            keywords = (config.keywords as string[]) || [];
            break;
          } catch { continue; }
        }

        const agentNames: string[] = [];
        try {
          const agentsDir = path.join(squadDir, 'agents');
          const files = await fs.readdir(agentsDir);
          for (const f of files) {
            if (f.endsWith('.md') && !f.startsWith('_')) {
              agentNames.push(f.replace(/\.md$/i, ''));
            }
          }
        } catch { /* no agents dir */ }

        if (agentNames.length > 0) {
          candidates.push({ id: entry.name, name: formatName(entry.name), description, keywords, agentNames });
        }
      }
    } catch { /* squads dir missing */ }

    // Add core AIOS agents as a virtual "development" squad
    const coreAgentsDir = path.join(projectRoot, '.aios-core', 'development', 'agents');
    try {
      const coreFiles = await fs.readdir(coreAgentsDir);
      const coreAgentNames = coreFiles
        .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
        .map((f) => f.replace(/\.md$/i, ''));
      if (coreAgentNames.length > 0) {
        const priority = ['dev', 'architect', 'qa', 'pm', 'devops', 'analyst', 'sm', 'po'];
        const sorted = [
          ...priority.filter((a) => coreAgentNames.includes(a)),
          ...coreAgentNames.filter((a) => !priority.includes(a)),
        ];
        candidates.push({
          id: 'development',
          name: 'Development',
          description: 'Core development squad with dev, qa, architect, pm, devops, analyst agents for software engineering tasks',
          keywords: ['code', 'develop', 'build', 'implement', 'fix', 'bug', 'feature', 'test', 'deploy', 'api', 'database', 'backend', 'frontend', 'react', 'typescript', 'javascript', 'python', 'component', 'function', 'class', 'module', 'refactor', 'optimize', 'debug', 'architecture', 'story', 'sprint', 'task', 'requirement', 'spec', 'login', 'auth', 'crud', 'rest', 'graphql'],
          agentNames: sorted,
        });
      }
    } catch { /* no core agents dir */ }

    return candidates;
  }
}

// ---------------------------------------------------------------------------
// Load agent persona from .md file
// ---------------------------------------------------------------------------

async function loadAgentPersona(squadId: string, agentId: string): Promise<string | null> {
  const projectRoot = getProjectRoot();
  const paths = [
    path.join(projectRoot, '.aios-core', 'development', 'agents', `${agentId}.md`),
    path.join(projectRoot, 'squads', squadId, 'agents', `${agentId}.md`),
  ];

  for (const p of paths) {
    try {
      return await fs.readFile(p, 'utf-8');
    } catch { continue; }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Claude CLI spawn helper
// ---------------------------------------------------------------------------

interface SpawnResult {
  output: string;
  streamCallback?: (accumulated: string) => void;
}

function spawnClaude(
  prompt: string,
  options?: {
    maxTurns?: string;
    onChunk?: (accumulated: string) => void;
    taskId?: string;
  },
): Promise<string> {
  const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
  const spawnEnv = { ...process.env };
  delete spawnEnv.CLAUDECODE;
  delete spawnEnv.CLAUDE_CODE_ENTRYPOINT;
  delete spawnEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;

  const projectRoot = process.env.AIOS_PROJECT_ROOT || path.resolve(process.cwd(), 'aios-platform');
  const maxTurns = options?.maxTurns || process.env.CLAUDE_MAX_TURNS || '25';
  const timeoutMs = parseInt(process.env.CLAUDE_TIMEOUT_MS || '1800000', 10);

  return new Promise<string>((resolve, reject) => {
    const proc = spawn(claudePath, ['--output-format', 'stream-json', '--verbose', '--max-turns', maxTurns, '--dangerously-skip-permissions'], {
      cwd: projectRoot,
      env: spawnEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Store child process reference for kill-switch
    if (options?.taskId) {
      updateTask(options.taskId, { childProcess: proc });
    }

    proc.stdin.write(prompt);
    proc.stdin.end();

    let buffer = '';
    let fullOutput = '';
    let finalResult = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);

          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
            fullOutput += parsed.delta.text;
            options?.onChunk?.(fullOutput);
          } else if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) {
                fullOutput += block.text;
                options?.onChunk?.(fullOutput);
              }
            }
          } else if (parsed.type === 'result' && parsed.result) {
            finalResult = String(parsed.result);
            if (!fullOutput) {
              fullOutput = finalResult;
              options?.onChunk?.(fullOutput);
            }
          }
        } catch { /* not JSON */ }
      }
    });

    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.type === 'result' && parsed.result) {
            finalResult = String(parsed.result);
            if (!fullOutput) fullOutput = finalResult;
          } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullOutput += parsed.delta.text;
          }
        } catch { /* ignore */ }
      }
      if (code === 0) {
        resolve(finalResult || fullOutput);
      } else {
        reject(new Error(stderr || `Claude CLI exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });

    setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch { /* already dead */ }
      reject(new Error(`Claude CLI execution timed out (${timeoutMs / 1000}s)`));
    }, timeoutMs);
  });
}

// ---------------------------------------------------------------------------
// Planning prompt builder
// ---------------------------------------------------------------------------

function buildPlanningPrompt(demand: string, squads: SquadCandidate[], feedback?: string): string {
  const squadSummary = squads.map(s =>
    `- **${s.id}** (${s.name}): ${s.description || 'Sem descrição'}. Agentes: ${s.agentNames.join(', ')}`
  ).join('\n');

  const feedbackSection = feedback
    ? `\n## Feedback do Usuário (ajuste o plano conforme solicitado)\n${feedback}\n`
    : '';

  return `Você é o Orquestrador Master do sistema AIOS. Sua tarefa é ANALISAR a demanda do usuário e produzir um PLANO DE EXECUÇÃO estruturado.

## Squads Disponíveis
${squadSummary}

## Demanda do Usuário
${demand}
${feedbackSection}
## Instruções
1. Analise a demanda e identifique quais squads e agentes são necessários
2. Decomponha em steps sequenciais (cada step = 1 agente executando uma parte)
3. Defina dependências entre steps quando aplicável
4. Retorne EXCLUSIVAMENTE um bloco JSON no formato abaixo (sem texto antes ou depois)

## Formato de Resposta (JSON PURO, sem markdown code fences)
{
  "summary": "Resumo do plano em 1-2 frases",
  "reasoning": "Explicação de por que estes squads/agentes foram escolhidos",
  "steps": [
    {
      "id": "step-1",
      "squadId": "development",
      "agentId": "architect",
      "agentName": "Architect",
      "squadName": "Development",
      "task": "Descrição específica do que este agente vai fazer",
      "dependsOn": [],
      "estimatedDuration": "5min"
    }
  ],
  "estimatedDuration": "15min"
}

REGRAS:
- Mínimo 1 step, máximo 8 steps
- Cada agente deve ter uma tarefa ESPECÍFICA e CLARA (não genérica)
- O primeiro step nunca tem dependências
- Use agentes reais dos squads listados
- Se a demanda é simples, use apenas 1-2 steps
- Se é complexa, distribua entre especialistas
- Inclua um step de QA/review para demandas que envolvem código
- RETORNE APENAS O JSON, sem explicação adicional
`;
}

// ---------------------------------------------------------------------------
// Parse plan from Claude output
// ---------------------------------------------------------------------------

function parsePlan(raw: string): ExecutionPlan | null {
  // Try to extract JSON from the response
  let jsonStr = raw.trim();

  // Remove markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try to find JSON object boundaries
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return null;
    }

    // Validate and normalize steps
    const steps: ExecutionPlanStep[] = parsed.steps.map((s: Record<string, unknown>, i: number) => ({
      id: (s.id as string) || `step-${i + 1}`,
      squadId: (s.squadId as string) || 'development',
      agentId: (s.agentId as string) || 'dev',
      agentName: (s.agentName as string) || formatName((s.agentId as string) || 'dev'),
      squadName: (s.squadName as string) || formatName((s.squadId as string) || 'development'),
      task: (s.task as string) || 'Executar tarefa',
      dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn as string[] : [],
      estimatedDuration: (s.estimatedDuration as string) || undefined,
    }));

    return {
      summary: (parsed.summary as string) || 'Plano de execução',
      reasoning: (parsed.reasoning as string) || '',
      steps,
      estimatedDuration: (parsed.estimatedDuration as string) || undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start task planning in the background.
 * After planning, the task pauses at `awaiting_approval` until approved.
 */
export function startTaskExecution(taskId: string): void {
  const task = getTask(taskId);
  if (!task) return;
  if (task.status !== 'pending') return;

  planTask(taskId).catch((err) => {
    const error = err instanceof Error ? err.message : String(err);
    updateTask(taskId, { status: 'failed', error });
    pushEvent(taskId, 'task:failed', { error });
    const t = getTask(taskId); if (t) persistTask(t);
  });
}

/**
 * Approve the plan and start execution.
 */
export function approveAndExecute(taskId: string): void {
  const task = getTask(taskId);
  if (!task || task.status !== 'awaiting_approval' || !task.plan) return;

  executeApprovedPlan(taskId).catch((err) => {
    const error = err instanceof Error ? err.message : String(err);
    updateTask(taskId, { status: 'failed', error });
    pushEvent(taskId, 'task:failed', { error });
    const t = getTask(taskId); if (t) persistTask(t);
  });
}

/**
 * Revise the plan with user feedback, then re-plan.
 */
export function revisePlan(taskId: string, feedback: string): void {
  const task = getTask(taskId);
  if (!task || task.status !== 'awaiting_approval') return;

  updateTask(taskId, { planFeedback: feedback });

  planTask(taskId, feedback).catch((err) => {
    const error = err instanceof Error ? err.message : String(err);
    updateTask(taskId, { status: 'failed', error });
    pushEvent(taskId, 'task:failed', { error });
    const t = getTask(taskId); if (t) persistTask(t);
  });
}

// ---------------------------------------------------------------------------
// Planning phase
// ---------------------------------------------------------------------------

async function planTask(taskId: string, feedback?: string): Promise<void> {
  const task = getTask(taskId);
  if (!task) return;

  // ── Phase 1: Analyzing ──
  updateTask(taskId, { status: 'analyzing', startedAt: task.startedAt || new Date().toISOString() });
  pushEvent(taskId, 'task:analyzing', { taskId });

  // Load available squads for the planner
  const candidates = await loadSquadCandidates();

  pushEvent(taskId, 'task:squads-selected', { squads: candidates.map(c => c.id) });

  // ── Phase 2: Planning (spawn Claude CLI as orchestrator) ──
  updateTask(taskId, { status: 'planning' });
  pushEvent(taskId, 'task:planning', { taskId });

  const planningPrompt = buildPlanningPrompt(task.demand, candidates, feedback);

  // Use short max-turns for planning (it should respond in 1 turn)
  const planRaw = await spawnClaude(planningPrompt, {
    maxTurns: '3',
    taskId,
  });

  const plan = parsePlan(planRaw);

  if (!plan) {
    // Fallback: create a single-step plan with the best-matching squad
    const fallbackPlan = createFallbackPlan(task.demand, candidates);
    updateTask(taskId, { status: 'awaiting_approval', plan: fallbackPlan });
    pushEvent(taskId, 'task:plan-ready', { taskId, plan: fallbackPlan });
    return;
  }

  // ── Phase 2.5: Awaiting approval ──
  updateTask(taskId, { status: 'awaiting_approval', plan });
  pushEvent(taskId, 'task:plan-ready', { taskId, plan });
}

/**
 * Fallback plan when the LLM output can't be parsed as JSON.
 */
function createFallbackPlan(demand: string, candidates: SquadCandidate[]): ExecutionPlan {
  // Score squads using keyword matching (same heuristic as before)
  const demandLower = demand.toLowerCase();

  let bestSquad = candidates[0];
  let bestScore = 0;

  for (const squad of candidates) {
    let score = 0;
    const words = demandLower.split(/\s+/);
    for (const kw of squad.keywords) {
      if (demandLower.includes(kw.toLowerCase())) score += 10;
    }
    for (const word of words) {
      if (word.length > 2 && squad.id.toLowerCase().includes(word)) score += 5;
    }
    score += Math.min(squad.agentNames.length, 5);
    if (squad.id === 'development') score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestSquad = squad;
    }
  }

  const agentId = bestSquad?.agentNames[0] || 'dev';
  const squadId = bestSquad?.id || 'development';

  return {
    summary: `Execução direta por ${formatName(agentId)} do squad ${formatName(squadId)}`,
    reasoning: 'Plano gerado automaticamente (fallback) — o orquestrador não conseguiu produzir um plano estruturado.',
    steps: [{
      id: 'step-1',
      squadId,
      agentId,
      agentName: formatName(agentId),
      squadName: formatName(squadId),
      task: demand,
      dependsOn: [],
    }],
  };
}

// ---------------------------------------------------------------------------
// Dependency level computation (topological layering)
// ---------------------------------------------------------------------------

function computeDependencyLevels(steps: ExecutionPlanStep[]): Map<string, number> {
  const levels = new Map<string, number>();
  const stepIds = new Set(steps.map(s => s.id));

  function getLevel(stepId: string, visited: Set<string>): number {
    if (levels.has(stepId)) return levels.get(stepId)!;
    if (visited.has(stepId)) return 0; // circular guard
    visited.add(stepId);

    const step = steps.find(s => s.id === stepId);
    if (!step || step.dependsOn.length === 0) {
      levels.set(stepId, 0);
      return 0;
    }

    let maxDep = 0;
    for (const depId of step.dependsOn) {
      if (stepIds.has(depId)) {
        maxDep = Math.max(maxDep, getLevel(depId, visited) + 1);
      }
    }
    levels.set(stepId, maxDep);
    return maxDep;
  }

  for (const step of steps) {
    getLevel(step.id, new Set());
  }

  return levels;
}

// ---------------------------------------------------------------------------
// Execution phase (parallel by dependency level)
// ---------------------------------------------------------------------------

async function executeApprovedPlan(taskId: string): Promise<void> {
  const task = getTask(taskId);
  if (!task?.plan) return;

  const plan = task.plan;

  // Build squad selections from plan
  const squadMap = new Map<string, { squadId: string; squadName: string; agents: Array<{ id: string; name: string }> }>();
  for (const step of plan.steps) {
    if (!squadMap.has(step.squadId)) {
      squadMap.set(step.squadId, { squadId: step.squadId, squadName: step.squadName, agents: [] });
    }
    const squad = squadMap.get(step.squadId)!;
    if (!squad.agents.some(a => a.id === step.agentId)) {
      squad.agents.push({ id: step.agentId, name: step.agentName });
    }
  }

  const squads = Array.from(squadMap.values()).map(s => ({
    squadId: s.squadId,
    chief: s.agents[0]?.name || 'Agent',
    agentCount: s.agents.length,
    agents: s.agents,
  }));

  // Emit planning events
  for (const squad of squads) {
    pushEvent(taskId, 'task:squad-planned', squad);
  }

  const workflowSteps = plan.steps.map(s => ({ id: s.id, name: `${s.agentName}: ${s.task.slice(0, 60)}` }));
  pushEvent(taskId, 'task:workflow-created', {
    workflowId: `wf-${taskId}`,
    steps: workflowSteps,
  });

  updateTask(taskId, { status: 'executing', squads });
  pushEvent(taskId, 'task:executing', { taskId });

  // Store outputs keyed by step ID for dependency context resolution
  const outputsByStepId = new Map<string, { stepId: string; stepName: string; output: Record<string, unknown> }>();

  const startTime = Date.now();

  // Compute dependency levels and group steps
  const levels = computeDependencyLevels(plan.steps);
  const maxLevel = Math.max(0, ...levels.values());

  const stepsByLevel: ExecutionPlanStep[][] = Array.from({ length: maxLevel + 1 }, () => []);
  for (const step of plan.steps) {
    const level = levels.get(step.id) ?? 0;
    stepsByLevel[level].push(step);
  }

  // Execute level by level — steps within the same level run in parallel
  for (let level = 0; level <= maxLevel; level++) {
    const levelSteps = stepsByLevel[level];

    const levelPromises = levelSteps.map(async (step) => {
      const stepId = step.id;
      const stepName = `${step.agentName}: ${step.task.slice(0, 80)}`;

      pushEvent(taskId, 'step:started', { stepId });
      pushEvent(taskId, 'step:streaming:start', {
        stepId,
        stepName,
        agent: { id: step.agentId, name: step.agentName, squad: step.squadId },
        role: step.dependsOn.length === 0 ? 'chief' : 'specialist',
      });

      const stepStart = Date.now();

      // Build context from this step's direct dependencies only
      const depContext = step.dependsOn
        .map(depId => outputsByStepId.get(depId))
        .filter(Boolean)
        .map(o => {
          const out = o!.output as { agent?: { name?: string }; response?: string };
          return `### Output de ${out.agent?.name || 'Agent'} (${o!.stepId})\n${out.response || ''}`;
        })
        .join('\n\n---\n\n');

      // Build agent prompt
      const persona = await loadAgentPersona(step.squadId, step.agentId);
      const executionInstructions = `
## IMPORTANT: Execution Rules
- You MUST actually perform the task, not just describe what you would do.
- Use your tools (Read, Grep, Glob, Bash) to explore the codebase and gather real information.
- Produce a comprehensive, detailed output with your findings.
- Write your final response in the user's language (Portuguese if the demand is in Portuguese).
- Be thorough and include specific file paths, code snippets, and actionable recommendations.
`;

      const contextSection = depContext
        ? `\n## Contexto de Steps Anteriores (suas dependencias)\n${depContext}\n`
        : '';

      let prompt: string;
      if (persona) {
        const condensed = persona.length > 4000 ? persona.slice(0, 4000) + '\n...(truncated)' : persona;
        prompt = `${condensed}\n${executionInstructions}${contextSection}\n## Sua Tarefa Especifica\n${step.task}\n\n## Demanda Original\n${task.demand}`;
      } else {
        prompt = `You are an AI agent named "${step.agentId}" in the "${step.squadId}" squad. Follow the user's instructions carefully and produce high-quality output.\n${executionInstructions}${contextSection}\n## Sua Tarefa Especifica\n${step.task}\n\n## Demanda Original\n${task.demand}`;
      }

      const result = await spawnClaude(prompt, {
        taskId,
        onChunk: (accumulated) => {
          pushEvent(taskId, 'step:streaming:chunk', { stepId, accumulated });
        },
      });

      const processingTimeMs = Date.now() - stepStart;
      const response = result || '';

      // Step done
      pushEvent(taskId, 'step:streaming:end', {
        stepId,
        stepName,
        agent: { id: step.agentId, name: step.agentName, squad: step.squadId },
        role: step.dependsOn.length === 0 ? 'chief' : 'specialist',
        response,
        processingTimeMs,
      });

      const stepOutput = {
        agent: { id: step.agentId, name: step.agentName, squad: step.squadId },
        role: step.dependsOn.length === 0 ? 'chief' : 'specialist',
        response,
        processingTimeMs,
      };

      pushEvent(taskId, 'step:completed', {
        stepId,
        stepName,
        output: stepOutput,
      });

      outputsByStepId.set(stepId, { stepId, stepName, output: stepOutput });
    });

    // Wait for all steps in this level to complete before moving to the next
    await Promise.all(levelPromises);
  }

  const totalDuration = Date.now() - startTime;

  // Collect all outputs in plan order for storage
  const allOutputs = plan.steps
    .map(s => outputsByStepId.get(s.id))
    .filter(Boolean) as Array<{ stepId: string; stepName: string; output: Record<string, unknown> }>;

  updateTask(taskId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    outputs: allOutputs,
  });

  // Persist completed task to Supabase
  const completedTask = getTask(taskId);
  if (completedTask) persistTask(completedTask);

  pushEvent(taskId, 'task:completed', { taskId, totalDuration });
}
