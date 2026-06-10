/**
 * useTaskReplay — Converts a completed Task into a WorkflowMission
 * and replays the execution step-by-step with animation.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { WorkflowMission, WorkflowOperation, WorkflowNode, WorkflowEdge } from '../components/workflow/types';
import type { Task } from '../services/api/tasks';
import type { SquadType } from '../types';
import { getSquadType } from '../types';

const NODE_SPACING_X = 180;
const NODE_SPACING_Y = 140;
const START_X = 80;
const START_Y = 300;

// --- Converter: Task → WorkflowMission ---

function buildMissionFromTask(task: Task): {
  mission: WorkflowMission;
  operations: WorkflowOperation[];
  replaySteps: ReplayStep[];
} {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const agents: WorkflowMission['agents'] = [];
  const operations: WorkflowOperation[] = [];
  const replaySteps: ReplayStep[] = [];

  // Start node
  nodes.push({
    id: 'node-start',
    type: 'start',
    label: 'Início',
    status: 'idle',
    position: { x: START_X, y: START_Y },
  });

  // Orchestrator node
  nodes.push({
    id: 'node-orchestrator',
    type: 'agent',
    label: 'Orquestrador',
    agentName: 'Bob',
    squadType: 'orchestrator' as SquadType,
    status: 'idle',
    position: { x: START_X + NODE_SPACING_X, y: START_Y },
    progress: 0,
  });

  edges.push({
    id: 'edge-start-orch',
    source: 'node-start',
    target: 'node-orchestrator',
    status: 'idle',
  });

  agents.push({
    id: 'bob',
    name: 'Bob',
    squadType: 'orchestrator' as SquadType,
    role: 'Orchestrator',
    status: 'waiting',
  });

  // Replay step 0: start + orchestrator
  replaySteps.push({
    type: 'activate',
    nodeIds: ['node-start', 'node-orchestrator'],
    edgeIds: ['edge-start-orch'],
    duration: 800,
  });

  // Build agent nodes from squads
  const agentNodeMap = new Map<string, string>(); // agent id/name → nodeId
  let colIndex = 0;

  task.squads.forEach((squad) => {
    const squadType = getSquadType(squad.squadId);
    const chiefNodeId = `node-chief-${squad.squadId}`;
    const chiefX = START_X + NODE_SPACING_X * 2 + colIndex * 40;

    // Chief node
    nodes.push({
      id: chiefNodeId,
      type: 'agent',
      label: squad.chief || 'Chief',
      agentName: squad.chief,
      squadType,
      status: 'idle',
      position: { x: chiefX, y: START_Y },
      progress: 0,
    });

    edges.push({
      id: `edge-orch-${chiefNodeId}`,
      source: 'node-orchestrator',
      target: chiefNodeId,
      status: 'idle',
    });

    agents.push({
      id: squad.chief,
      name: squad.chief,
      squadType,
      role: 'chief',
      status: 'waiting',
    });

    agentNodeMap.set(squad.chief.toLowerCase(), chiefNodeId);

    // Agent nodes
    squad.agents.forEach((agent, idx) => {
      if (agent.id === squad.chief || agent.name === squad.chief) return;
      const agentNodeId = `node-agent-${agent.id}`;
      const yOffset = (idx - Math.floor(squad.agents.length / 2)) * NODE_SPACING_Y;

      nodes.push({
        id: agentNodeId,
        type: 'agent',
        label: agent.name || agent.id,
        agentName: agent.name || agent.id,
        squadType,
        status: 'idle',
        position: {
          x: chiefX + NODE_SPACING_X,
          y: START_Y + yOffset,
        },
        progress: 0,
      });

      edges.push({
        id: `edge-${chiefNodeId}-${agentNodeId}`,
        source: chiefNodeId,
        target: agentNodeId,
        status: 'idle',
      });

      agents.push({
        id: agent.id,
        name: agent.name || agent.id,
        squadType,
        role: 'specialist',
        status: 'waiting',
      });

      agentNodeMap.set((agent.name || agent.id).toLowerCase(), agentNodeId);
      agentNodeMap.set(agent.id.toLowerCase(), agentNodeId);
    });

    colIndex++;
  });

  // Replay step 1: complete orchestrator, show squads
  const squadNodeIds = nodes.filter(n => n.id.startsWith('node-chief-') || n.id.startsWith('node-agent-')).map(n => n.id);
  const squadEdgeIds = edges.filter(e => e.source === 'node-orchestrator' || e.source.startsWith('node-chief-')).map(e => e.id);

  replaySteps.push({
    type: 'complete-and-activate',
    completeNodeIds: ['node-orchestrator'],
    completeEdgeIds: ['edge-start-orch'],
    activateNodeIds: squadNodeIds,
    activateEdgeIds: squadEdgeIds,
    duration: 1200,
  });

  // Review + End nodes
  const maxX = Math.max(...nodes.map(n => n.position.x));
  const reviewX = maxX + NODE_SPACING_X;

  nodes.push({
    id: 'node-review',
    type: 'checkpoint',
    label: 'Revisão Final',
    status: 'idle',
    position: { x: reviewX, y: START_Y },
  });

  nodes.push({
    id: 'node-end',
    type: 'end',
    label: 'Concluído',
    status: 'idle',
    position: { x: reviewX + NODE_SPACING_X, y: START_Y },
  });

  // Connect leaf nodes to review
  const agentLeafNodes = nodes.filter(n =>
    n.type === 'agent' && n.id !== 'node-orchestrator' && !n.id.startsWith('node-chief-')
  );
  const chiefNodes = nodes.filter(n => n.id.startsWith('node-chief-'));
  const leafNodes = agentLeafNodes.length > 0 ? agentLeafNodes : chiefNodes;

  leafNodes.forEach(n => {
    edges.push({
      id: `edge-${n.id}-review`,
      source: n.id,
      target: 'node-review',
      status: 'idle',
    });
  });

  edges.push({
    id: 'edge-review-end',
    source: 'node-review',
    target: 'node-end',
    status: 'idle',
  });

  // Build replay steps from task outputs (skip empty outputs)
  const validOutputs = task.outputs.filter(o =>
    (o.output.response && o.output.response.length > 0) ||
    (o.output.content && o.output.content.length > 0)
  );

  validOutputs.forEach((output) => {
    const agentName = output.output.agent?.name || output.output.agent?.id;
    const nodeId = agentName
      ? agentNodeMap.get(agentName.toLowerCase()) ||
        agentNodeMap.get((output.output.agent?.id || '').toLowerCase())
      : undefined;

    const stepDuration = output.output.processingTimeMs
      ? Math.min(Math.max(output.output.processingTimeMs / 20, 300), 3000) // Scale down, clamp between 300ms and 3s
      : 1500;

    if (nodeId) {
      // Activate step — include agent response for enriched replay
      const responseText = output.output.response || output.output.content || '';
      replaySteps.push({
        type: 'step-execute',
        nodeId,
        agentName: agentName || 'Agent',
        stepName: output.stepName,
        duration: stepDuration,
        output: responseText.length > 500
          ? responseText.slice(0, 497) + '...'
          : responseText,
      });

      // Operation
      operations.push({
        id: `op-${output.stepId}`,
        missionId: task.id,
        agentName: agentName || 'Agent',
        squadType: (output.output.agent?.squad ? getSquadType(output.output.agent.squad) : 'orchestrator') as SquadType,
        action: output.stepName,
        status: 'completed',
        startedAt: task.startedAt || task.createdAt,
        duration: output.output.processingTimeMs ? Math.floor(output.output.processingTimeMs / 1000) : undefined,
      });
    }
  });

  // Final replay step: complete everything
  replaySteps.push({
    type: 'complete-all',
    duration: 800,
  });

  const mission: WorkflowMission = {
    id: task.id,
    name: task.demand.length > 60 ? task.demand.slice(0, 57) + '...' : task.demand,
    description: task.demand,
    status: 'queued',
    startedAt: task.startedAt || task.createdAt,
    completedAt: task.completedAt,
    progress: 0,
    nodes,
    edges,
    agents,
  };

  return { mission, operations, replaySteps };
}

// --- Replay Step Types ---

interface ReplayStepActivate {
  type: 'activate';
  nodeIds: string[];
  edgeIds: string[];
  duration: number;
}

interface ReplayStepCompleteAndActivate {
  type: 'complete-and-activate';
  completeNodeIds: string[];
  completeEdgeIds: string[];
  activateNodeIds: string[];
  activateEdgeIds: string[];
  duration: number;
}

interface ReplayStepExecute {
  type: 'step-execute';
  nodeId: string;
  agentName: string;
  stepName: string;
  duration: number;
  output?: string; // Agent response content for enriched replay
}

interface ReplayStepCompleteAll {
  type: 'complete-all';
  duration: number;
}

type ReplayStep =
  | ReplayStepActivate
  | ReplayStepCompleteAndActivate
  | ReplayStepExecute
  | ReplayStepCompleteAll;

// --- Hook ---

export interface ReplayStepLabel {
  index: number;
  label: string;
  type: ReplayStep['type'];
}

export interface TaskReplayState {
  mission: WorkflowMission | null;
  operations: WorkflowOperation[];
  isPlaying: boolean;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
  taskId: string | null;
  speed: number; // 1 = normal, 2 = 2x, 0.5 = half
  stepLabels: ReplayStepLabel[];
}

/** Build human-readable labels for each replay step */
function buildStepLabels(steps: ReplayStep[]): ReplayStepLabel[] {
  return steps.map((step, index) => {
    let label: string;
    switch (step.type) {
      case 'activate':
        label = 'Inicialização';
        break;
      case 'complete-and-activate':
        label = 'Squads ativados';
        break;
      case 'step-execute':
        label = `${step.agentName}: ${step.stepName}`;
        break;
      case 'complete-all':
        label = 'Concluído';
        break;
      default:
        label = `Step ${index + 1}`;
    }
    return { index, label, type: step.type };
  });
}

export function useTaskReplay() {
  const [state, setState] = useState<TaskReplayState>({
    mission: null,
    operations: [],
    isPlaying: false,
    isPaused: false,
    currentStep: 0,
    totalSteps: 0,
    taskId: null,
    speed: 1,
    stepLabels: [],
  });

  const replayStepsRef = useRef<ReplayStep[]>([]);
  const baseMissionRef = useRef<{ mission: WorkflowMission; operations: WorkflowOperation[] } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStepRef = useRef(0);
  const speedRef = useRef(1);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applyStep = useCallback((stepIndex: number) => {
    const step = replayStepsRef.current[stepIndex];
    if (!step) return;

    setState(prev => {
      if (!prev.mission) return prev;
      const m = {
        ...prev.mission,
        nodes: [...prev.mission.nodes],
        edges: [...prev.mission.edges],
        agents: [...prev.mission.agents],
      };

      switch (step.type) {
        case 'activate': {
          m.nodes = m.nodes.map(n =>
            step.nodeIds.includes(n.id)
              ? { ...n, status: n.type === 'start' ? 'completed' as const : 'active' as const, progress: n.type === 'start' ? 100 : 10, startedAt: new Date().toISOString() }
              : n
          );
          m.edges = m.edges.map(e =>
            step.edgeIds.includes(e.id) ? { ...e, status: 'active' as const, animated: true } : e
          );
          m.status = 'in-progress';
          m.progress = Math.floor((stepIndex / replayStepsRef.current.length) * 100);
          break;
        }

        case 'complete-and-activate': {
          m.nodes = m.nodes.map(n => {
            if (step.completeNodeIds.includes(n.id)) {
              return { ...n, status: 'completed' as const, progress: 100, completedAt: new Date().toISOString() };
            }
            if (step.activateNodeIds.includes(n.id)) {
              return { ...n, status: 'waiting' as const, progress: 0 };
            }
            return n;
          });
          m.edges = m.edges.map(e => {
            if (step.completeEdgeIds.includes(e.id)) {
              return { ...e, status: 'completed' as const, animated: false };
            }
            if (step.activateEdgeIds.includes(e.id)) {
              return { ...e, status: 'active' as const, animated: true };
            }
            return e;
          });
          m.agents = m.agents.map(a => {
            if (step.completeNodeIds.some(id => id.includes(a.id) || id.includes(a.name.toLowerCase()))) {
              return { ...a, status: 'completed' as const, currentTask: 'Concluído' };
            }
            return a;
          });
          m.progress = Math.floor((stepIndex / replayStepsRef.current.length) * 100);
          break;
        }

        case 'step-execute': {
          m.nodes = m.nodes.map(n => {
            if (n.id === step.nodeId) {
              return {
                ...n,
                status: 'active' as const,
                progress: 50,
                currentAction: step.stepName,
                startedAt: new Date().toISOString(),
                output: step.output || n.output, // Enriched replay: store agent response
              };
            }
            return n;
          });
          m.edges = m.edges.map(e =>
            e.target === step.nodeId ? { ...e, status: 'active' as const, animated: true } : e
          );
          m.agents = m.agents.map(a =>
            a.name === step.agentName || a.id === step.agentName
              ? { ...a, status: 'working' as const, currentTask: step.stepName }
              : a
          );
          m.progress = Math.floor((stepIndex / replayStepsRef.current.length) * 100);
          break;
        }

        case 'complete-all': {
          m.status = 'completed';
          m.progress = 100;
          m.completedAt = new Date().toISOString();
          m.nodes = m.nodes.map(n => ({
            ...n,
            status: 'completed' as const,
            progress: n.progress !== undefined ? 100 : n.progress,
          }));
          m.edges = m.edges.map(e => ({ ...e, status: 'completed' as const, animated: false }));
          m.agents = m.agents.map(a => ({ ...a, status: 'completed' as const, currentTask: 'Concluído' }));
          break;
        }
      }

      return {
        ...prev,
        mission: m,
        currentStep: stepIndex + 1,
        isPlaying: step.type !== 'complete-all',
      };
    });
  }, []);

  // Tick counter drives the replay loop via useEffect
  const [tick, setTick] = useState(0);
  const playingRef = useRef(false);

  // Main replay loop — driven by tick changes
  useEffect(() => {
    if (tick === 0 || !playingRef.current) return;

    const nextIndex = currentStepRef.current;
    if (nextIndex >= replayStepsRef.current.length) return;

    const step = replayStepsRef.current[nextIndex];
    const delay = step.duration / speedRef.current;

    timerRef.current = setTimeout(() => {
      applyStep(nextIndex);
      currentStepRef.current = nextIndex + 1;

      if (step.type === 'step-execute') {
        // Complete the node after a delay, then advance
        const completeDelay = (step.duration * 0.6) / speedRef.current;
        timerRef.current = setTimeout(() => {
          setState(prev => {
            if (!prev.mission) return prev;
            return {
              ...prev,
              mission: {
                ...prev.mission,
                nodes: prev.mission.nodes.map(n =>
                  n.id === step.nodeId
                    ? { ...n, status: 'completed' as const, progress: 100, completedAt: new Date().toISOString(), currentAction: 'Concluído' }
                    : n
                ),
                edges: prev.mission.edges.map(e =>
                  e.target === step.nodeId || e.source === step.nodeId
                    ? { ...e, status: 'completed' as const, animated: false }
                    : e
                ),
                agents: prev.mission.agents.map(a =>
                  a.name === step.agentName || a.id === step.agentName
                    ? { ...a, status: 'completed' as const, currentTask: 'Concluído' }
                    : a
                ),
              },
            };
          });
          // Trigger next tick
          setTick(t => t + 1);
        }, completeDelay);
      } else {
        // Trigger next tick
        setTick(t => t + 1);
      }
    }, delay);

    return () => clearTimer();
  }, [tick, applyStep, clearTimer]);

  const load = useCallback((task: Task) => {
    clearTimer();
    playingRef.current = false;
    const { mission, operations, replaySteps } = buildMissionFromTask(task);
    replayStepsRef.current = replaySteps;
    baseMissionRef.current = {
      mission: JSON.parse(JSON.stringify(mission)),
      operations: [...operations],
    };
    currentStepRef.current = 0;

    setState({
      mission,
      operations,
      isPlaying: false,
      isPaused: false,
      currentStep: 0,
      totalSteps: replaySteps.length,
      taskId: task.id,
      speed: 1,
      stepLabels: buildStepLabels(replaySteps),
    });
  }, [clearTimer]);

  const play = useCallback(() => {
    playingRef.current = true;
    setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
    setTick(t => t + 1); // Trigger the replay loop
  }, []);

  const pause = useCallback(() => {
    playingRef.current = false;
    clearTimer();
    setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    currentStepRef.current = 0;
    // Reload mission from scratch
    setState(prev => {
      if (!prev.taskId) return { ...prev, mission: null, operations: [], isPlaying: false, isPaused: false, currentStep: 0 };
      return prev; // Will need to call load() again
    });
  }, [clearTimer]);

  const setSpeed = useCallback((speed: number) => {
    speedRef.current = speed;
    setState(prev => ({ ...prev, speed }));
  }, []);

  /** Jump to a specific step index (0-based). Rebuilds state from base mission. */
  const seekTo = useCallback((targetStep: number) => {
    if (!baseMissionRef.current) return;
    clearTimer();
    playingRef.current = false;

    const clamped = Math.max(0, Math.min(targetStep, replayStepsRef.current.length));

    // Restore base mission (deep clone)
    const baseMission: WorkflowMission = JSON.parse(JSON.stringify(baseMissionRef.current.mission));

    // Create a temporary state object and apply steps sequentially
    let m = baseMission;
    for (let i = 0; i < clamped; i++) {
      const step = replayStepsRef.current[i];
      if (!step) break;

      const mCopy = {
        ...m,
        nodes: [...m.nodes],
        edges: [...m.edges],
        agents: [...m.agents],
      };

      switch (step.type) {
        case 'activate': {
          mCopy.nodes = mCopy.nodes.map(n =>
            step.nodeIds.includes(n.id)
              ? { ...n, status: n.type === 'start' ? 'completed' as const : 'active' as const, progress: n.type === 'start' ? 100 : 10 }
              : n
          );
          mCopy.edges = mCopy.edges.map(e =>
            step.edgeIds.includes(e.id) ? { ...e, status: 'active' as const, animated: true } : e
          );
          mCopy.status = 'in-progress';
          mCopy.progress = Math.floor((i / replayStepsRef.current.length) * 100);
          break;
        }
        case 'complete-and-activate': {
          mCopy.nodes = mCopy.nodes.map(n => {
            if (step.completeNodeIds.includes(n.id)) return { ...n, status: 'completed' as const, progress: 100 };
            if (step.activateNodeIds.includes(n.id)) return { ...n, status: 'waiting' as const, progress: 0 };
            return n;
          });
          mCopy.edges = mCopy.edges.map(e => {
            if (step.completeEdgeIds.includes(e.id)) return { ...e, status: 'completed' as const, animated: false };
            if (step.activateEdgeIds.includes(e.id)) return { ...e, status: 'active' as const, animated: true };
            return e;
          });
          mCopy.progress = Math.floor((i / replayStepsRef.current.length) * 100);
          break;
        }
        case 'step-execute': {
          // Mark node as completed (since we're seeking past it)
          mCopy.nodes = mCopy.nodes.map(n =>
            n.id === step.nodeId
              ? { ...n, status: 'completed' as const, progress: 100, currentAction: 'Concluído', output: step.output || n.output }
              : n
          );
          mCopy.edges = mCopy.edges.map(e =>
            e.target === step.nodeId || e.source === step.nodeId
              ? { ...e, status: 'completed' as const, animated: false }
              : e
          );
          mCopy.agents = mCopy.agents.map(a =>
            a.name === step.agentName || a.id === step.agentName
              ? { ...a, status: 'completed' as const, currentTask: 'Concluído' }
              : a
          );
          mCopy.progress = Math.floor((i / replayStepsRef.current.length) * 100);
          break;
        }
        case 'complete-all': {
          mCopy.status = 'completed';
          mCopy.progress = 100;
          mCopy.nodes = mCopy.nodes.map(n => ({ ...n, status: 'completed' as const, progress: n.progress !== undefined ? 100 : n.progress }));
          mCopy.edges = mCopy.edges.map(e => ({ ...e, status: 'completed' as const, animated: false }));
          mCopy.agents = mCopy.agents.map(a => ({ ...a, status: 'completed' as const, currentTask: 'Concluído' }));
          break;
        }
      }
      m = mCopy;
    }

    currentStepRef.current = clamped;
    setState(prev => ({
      ...prev,
      mission: m,
      currentStep: clamped,
      isPlaying: false,
      isPaused: clamped > 0 && clamped < replayStepsRef.current.length,
    }));
  }, [clearTimer]);

  const stop = useCallback(() => {
    playingRef.current = false;
    clearTimer();
    replayStepsRef.current = [];
    baseMissionRef.current = null;
    currentStepRef.current = 0;
    setState({
      mission: null,
      operations: [],
      isPlaying: false,
      isPaused: false,
      currentStep: 0,
      totalSteps: 0,
      taskId: null,
      speed: 1,
      stepLabels: [],
    });
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { state, load, play, pause, reset, stop, setSpeed, seekTo };
}
