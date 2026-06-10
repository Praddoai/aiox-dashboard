/**
 * taskStateToMission — Converts TaskOrchestrator's TaskState into a
 * WorkflowMission for real-time DAG visualization on WorkflowCanvas.
 *
 * When a plan is available (awaiting_approval or executing), each plan step
 * becomes an individual node. Steps are laid out by dependency level:
 *   start → orchestrator → [level 0 steps] → [level 1 steps] → ... → end
 *
 * Fallback: when no plan exists, uses squad-based grouping (legacy).
 */
import type { WorkflowMission, WorkflowNode, WorkflowEdge } from '../components/workflow/types';
import type { ExecutionPlanStep } from '../components/orchestration/orchestration-types';

/** Minimal TaskState shape consumed by this converter. */
export interface TaskStateForMission {
  taskId: string | null;
  status: 'idle' | 'analyzing' | 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed';
  demand: string;
  plan: {
    steps: ExecutionPlanStep[];
    summary: string;
  } | null;
  squadSelections: Array<{
    squadId: string;
    chief: string;
    agentCount: number;
    agents: Array<{ id: string; name: string }>;
  }>;
  agentOutputs: Array<{
    stepId: string;
    stepName: string;
    agent: { id: string; name: string; squad: string };
    role: string;
    response: string;
    processingTimeMs: number;
  }>;
  streamingOutputs: Map<string, {
    stepId: string;
    stepName: string;
    agent: { id: string; name: string; squad: string };
    role: string;
    accumulated: string;
  }>;
  startTime: number | null;
}

const STATUS_MAP: Record<TaskStateForMission['status'], WorkflowMission['status']> = {
  idle: 'queued',
  analyzing: 'in-progress',
  planning: 'in-progress',
  awaiting_approval: 'in-progress',
  executing: 'in-progress',
  completed: 'completed',
  failed: 'error',
};

// ---------------------------------------------------------------------------
// Dependency level computation (topological layering)
// ---------------------------------------------------------------------------

function computeDependencyLevels(steps: ExecutionPlanStep[]): Map<string, number> {
  const levels = new Map<string, number>();
  const stepIds = new Set(steps.map(s => s.id));

  function getLevel(stepId: string, visited: Set<string>): number {
    if (levels.has(stepId)) return levels.get(stepId)!;
    if (visited.has(stepId)) return 0; // circular dependency guard
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
// Main converter
// ---------------------------------------------------------------------------

export function taskStateToMission(state: TaskStateForMission): WorkflowMission | null {
  if (state.status === 'idle') return null;

  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const hasPlan = state.plan && state.plan.steps.length > 0;

  // Layout constants
  const X_START = 80;
  const X_ORCH = 250;
  const X_STEP_BASE = 450;
  const X_STEP_GAP = 220;
  const Y_CENTER = 300;
  const Y_SPACING = 140;

  // -- Start node --
  nodes.push({
    id: 'start',
    type: 'start',
    label: 'Início',
    status: 'completed',
    position: { x: X_START, y: Y_CENTER },
  });

  // -- Orchestrator node --
  const orchStatus: WorkflowNode['status'] =
    state.status === 'analyzing' || state.status === 'planning'
      ? 'active'
      : state.status === 'awaiting_approval'
      ? 'waiting'
      : state.status === 'executing' || state.status === 'completed'
      ? 'completed'
      : state.status === 'failed' && !hasPlan
      ? 'error'
      : 'idle';

  const orchProgress =
    orchStatus === 'active'
      ? state.status === 'analyzing' ? 30 : 70
      : orchStatus === 'waiting' ? 90
      : orchStatus === 'completed' ? 100 : 0;

  nodes.push({
    id: 'orchestrator',
    type: 'agent',
    label: 'Orquestrador',
    agentName: 'Master',
    squadType: 'orchestrator',
    status: orchStatus,
    position: { x: X_ORCH, y: Y_CENTER },
    progress: orchProgress,
    currentAction: state.status === 'analyzing'
      ? 'Analisando demanda...'
      : state.status === 'planning'
      ? 'Planejando execução...'
      : state.status === 'awaiting_approval'
      ? 'Aguardando aprovação...'
      : orchStatus === 'completed'
      ? 'Plano aprovado'
      : undefined,
  });

  edges.push({
    id: 'edge-start-orch',
    source: 'start',
    target: 'orchestrator',
    status: 'completed',
  });

  // Collect finished/streaming step IDs
  const finishedStepIds = new Set(state.agentOutputs.map(o => o.stepId));
  const streamingStepIds = new Set([...state.streamingOutputs.keys()]);

  if (hasPlan) {
    // ── Plan-based layout: each step is a node ──
    const planSteps = state.plan!.steps;
    const levels = computeDependencyLevels(planSteps);
    const maxLevel = Math.max(0, ...levels.values());

    // Group steps by level
    const stepsByLevel: ExecutionPlanStep[][] = Array.from({ length: maxLevel + 1 }, () => []);
    for (const step of planSteps) {
      const level = levels.get(step.id) ?? 0;
      stepsByLevel[level].push(step);
    }

    // Create nodes per level
    for (let level = 0; level <= maxLevel; level++) {
      const levelSteps = stepsByLevel[level];
      const xPos = X_STEP_BASE + level * X_STEP_GAP;
      const yStart = levelSteps.length > 1
        ? Y_CENTER - ((levelSteps.length - 1) * Y_SPACING) / 2
        : Y_CENTER;

      for (let i = 0; i < levelSteps.length; i++) {
        const step = levelSteps[i];
        const isFinished = finishedStepIds.has(step.id);
        const isStreaming = streamingStepIds.has(step.id);

        let nodeStatus: WorkflowNode['status'] = 'idle';
        let progress = 0;
        let currentAction: string | undefined;

        if (state.status === 'awaiting_approval') {
          nodeStatus = 'idle';
          currentAction = step.task.length > 40 ? step.task.slice(0, 37) + '...' : step.task;
        } else if (isFinished) {
          nodeStatus = 'completed';
          progress = 100;
          currentAction = 'Concluído';
        } else if (isStreaming) {
          nodeStatus = 'active';
          progress = 50;
          currentAction = `${step.agentName} gerando...`;
        } else if (state.status === 'failed') {
          nodeStatus = 'error';
        } else if (state.status === 'executing') {
          nodeStatus = 'waiting';
          currentAction = 'Aguardando...';
        }

        // Get output for this step
        const output = state.agentOutputs.find(o => o.stepId === step.id);
        const streaming = state.streamingOutputs.get(step.id);

        nodes.push({
          id: step.id,
          type: 'agent',
          label: step.agentName,
          agentName: step.agentName,
          squadType: step.squadId as WorkflowNode['squadType'],
          status: nodeStatus,
          position: { x: xPos, y: yStart + i * Y_SPACING },
          progress,
          currentAction,
          output: output?.response || streaming?.accumulated,
        });

        // Edges: from dependencies or from orchestrator
        if (step.dependsOn.length > 0) {
          for (const depId of step.dependsOn) {
            const depFinished = finishedStepIds.has(depId);
            edges.push({
              id: `edge-${depId}-${step.id}`,
              source: depId,
              target: step.id,
              status: depFinished && (isFinished || isStreaming) ? 'completed'
                : depFinished ? 'active' : 'idle',
              animated: isStreaming,
            });
          }
        } else {
          // Level 0 steps connect from orchestrator
          edges.push({
            id: `edge-orch-${step.id}`,
            source: 'orchestrator',
            target: step.id,
            status: orchStatus === 'completed' && (isFinished || isStreaming) ? 'completed'
              : orchStatus === 'completed' ? 'active' : 'idle',
            animated: isStreaming,
          });
        }

        // Edge to end node (only for steps that nothing depends on)
        const hasDependants = planSteps.some(s => s.dependsOn.includes(step.id));
        if (!hasDependants) {
          edges.push({
            id: `edge-${step.id}-end`,
            source: step.id,
            target: 'end',
            status: isFinished ? 'completed' : 'idle',
          });
        }
      }
    }

    // Adjust end node X position based on levels
    const endX = X_STEP_BASE + (maxLevel + 1) * X_STEP_GAP;

    // End node
    const endStatus: WorkflowNode['status'] =
      state.status === 'completed' ? 'completed' :
      state.status === 'failed' ? 'error' : 'idle';

    nodes.push({
      id: 'end',
      type: 'end',
      label: state.status === 'completed' ? 'Concluído' : state.status === 'failed' ? 'Falhou' : 'Fim',
      status: endStatus,
      position: { x: endX, y: Y_CENTER },
    });

    // Build agents list from plan
    const agents = planSteps.map(step => {
      const isFinished = finishedStepIds.has(step.id);
      const isStreaming = streamingStepIds.has(step.id);
      return {
        id: step.agentId,
        name: step.agentName,
        squadType: step.squadId as import('../types').SquadType,
        role: step.dependsOn.length === 0 ? 'Chief' : 'Specialist',
        status: (isStreaming ? 'working' : isFinished ? 'completed' : 'waiting') as 'working' | 'completed' | 'waiting',
        currentTask: isStreaming
          ? 'Gerando resposta...'
          : isFinished
          ? 'Concluído'
          : step.task.length > 40 ? step.task.slice(0, 37) + '...' : step.task,
      };
    });

    // Progress
    const totalSteps = planSteps.length;
    const doneSteps = state.agentOutputs.length;
    const overallProgress =
      state.status === 'completed' ? 100 :
      state.status === 'analyzing' ? 10 :
      state.status === 'planning' ? 20 :
      state.status === 'awaiting_approval' ? 30 :
      totalSteps > 0
        ? 30 + Math.round((doneSteps / totalSteps) * 70)
        : 30;

    return {
      id: state.taskId || 'live-task',
      name: state.demand.length > 60 ? state.demand.slice(0, 57) + '...' : state.demand,
      description: state.demand,
      status: STATUS_MAP[state.status],
      startedAt: state.startTime ? new Date(state.startTime).toISOString() : undefined,
      progress: overallProgress,
      nodes,
      edges,
      agents,
    };
  }

  // ── Fallback: squad-based layout (no plan yet) ──
  const squads = state.squadSelections;
  const totalSquads = squads.length;
  const yStart = totalSquads > 1
    ? Y_CENTER - ((totalSquads - 1) * Y_SPACING) / 2
    : Y_CENTER;

  squads.forEach((squad, i) => {
    const nodeId = `ts-squad-${squad.squadId}`;
    const finished = state.agentOutputs.filter(o => o.agent.squad === squad.squadId);
    const streaming = [...state.streamingOutputs.values()].filter(s => s.agent.squad === squad.squadId);
    const totalSteps = squad.agentCount;

    let nodeStatus: WorkflowNode['status'] = 'idle';
    let progress = 0;
    let currentAction: string | undefined;

    if (state.status === 'completed' || finished.length >= totalSteps) {
      nodeStatus = 'completed';
      progress = 100;
      currentAction = 'Concluído';
    } else if (streaming.length > 0) {
      nodeStatus = 'active';
      progress = Math.round(((finished.length + 0.5) / Math.max(totalSteps, 1)) * 100);
      currentAction = `${streaming[0].agent.name} gerando...`;
    } else if (state.status === 'executing') {
      nodeStatus = 'waiting';
      currentAction = 'Aguardando...';
    }

    const lastOutput = [...state.agentOutputs].reverse().find(o => o.agent.squad === squad.squadId);

    nodes.push({
      id: nodeId,
      type: 'agent',
      label: squad.squadId,
      agentName: squad.chief,
      squadType: squad.squadId as WorkflowNode['squadType'],
      status: nodeStatus,
      position: { x: X_STEP_BASE, y: yStart + i * Y_SPACING },
      progress,
      currentAction,
      output: lastOutput?.response,
    });

    edges.push({
      id: `edge-orch-${squad.squadId}`,
      source: 'orchestrator',
      target: nodeId,
      status: nodeStatus === 'completed' ? 'completed' : orchStatus === 'completed' ? 'active' : 'idle',
      animated: nodeStatus === 'active',
    });

    edges.push({
      id: `edge-${squad.squadId}-end`,
      source: nodeId,
      target: 'end',
      status: nodeStatus === 'completed' ? 'completed' : 'idle',
    });
  });

  // End node (fallback)
  nodes.push({
    id: 'end',
    type: 'end',
    label: state.status === 'completed' ? 'Concluído' : state.status === 'failed' ? 'Falhou' : 'Fim',
    status: state.status === 'completed' ? 'completed' : state.status === 'failed' ? 'error' : 'idle',
    position: { x: X_STEP_BASE + X_STEP_GAP, y: Y_CENTER },
  });

  // Agents list (fallback)
  const agents = squads.flatMap((squad) =>
    squad.agents.map((agent) => {
      const hasOutput = state.agentOutputs.some(o => o.agent.id === agent.id);
      const isStreaming = [...state.streamingOutputs.values()].some(s => s.agent.id === agent.id);
      return {
        id: agent.id,
        name: agent.name,
        squadType: squad.squadId as import('../types').SquadType,
        role: agent.id === squad.chief ? 'Chief' : 'Specialist',
        status: (isStreaming ? 'working' : hasOutput ? 'completed' : 'waiting') as 'working' | 'completed' | 'waiting',
        currentTask: isStreaming ? 'Gerando resposta...' : hasOutput ? 'Concluído' : 'Aguardando',
      };
    })
  );

  const totalOutputsExpected = squads.reduce((s, sq) => s + sq.agentCount, 0);
  const overallProgress =
    state.status === 'completed' ? 100 :
    state.status === 'analyzing' ? 10 :
    state.status === 'planning' ? 20 :
    state.status === 'awaiting_approval' ? 30 :
    totalOutputsExpected > 0
      ? 30 + Math.round((state.agentOutputs.length / totalOutputsExpected) * 70)
      : 30;

  return {
    id: state.taskId || 'live-task',
    name: state.demand.length > 60 ? state.demand.slice(0, 57) + '...' : state.demand,
    description: state.demand,
    status: STATUS_MAP[state.status],
    startedAt: state.startTime ? new Date(state.startTime).toISOString() : undefined,
    progress: overallProgress,
    nodes,
    edges,
    agents,
  };
}
