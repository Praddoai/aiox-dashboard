/**
 * useTaskLiveMission — converts real task orchestration SSE events
 * into WorkflowMission format for the visual canvas.
 */
import { useState, useRef, useCallback } from 'react';
import type { WorkflowMission, WorkflowOperation } from '../components/workflow/types';
import type { SquadType } from '../types';
import { getSquadType } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface LiveMissionState {
  mission: WorkflowMission | null;
  operations: WorkflowOperation[];
  isRunning: boolean;
  taskId: string | null;
  error: string | null;
}

const NODE_SPACING_X = 180;
const NODE_SPACING_Y = 140;
const START_X = 80;
const START_Y = 300;

function buildEdgeId(source: string, target: string) {
  return `edge-${source}-${target}`;
}

export function useTaskLiveMission() {
  const [state, setState] = useState<LiveMissionState>({
    mission: null,
    operations: [],
    isRunning: false,
    taskId: null,
    error: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const close = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    close();
    reconnectAttemptRef.current = 0;
    setState({ mission: null, operations: [], isRunning: false, taskId: null, error: null });
  }, [close]);

  const start = useCallback(async (demand: string) => {
    close();
    startTimeRef.current = Date.now();

    // Initial mission shell
    const initialMission: WorkflowMission = {
      id: 'live',
      name: demand.length > 60 ? demand.slice(0, 57) + '...' : demand,
      description: demand,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
      progress: 0,
      nodes: [
        {
          id: 'node-start',
          type: 'start',
          label: 'Início',
          status: 'completed',
          position: { x: START_X, y: START_Y },
        },
        {
          id: 'node-orchestrator',
          type: 'agent',
          label: 'Orquestrador',
          agentName: 'Bob',
          squadType: 'orchestrator' as SquadType,
          status: 'active',
          position: { x: START_X + NODE_SPACING_X, y: START_Y },
          progress: 0,
          currentAction: 'Analisando demanda...',
          startedAt: new Date().toISOString(),
        },
      ],
      edges: [
        {
          id: 'edge-start-orch',
          source: 'node-start',
          target: 'node-orchestrator',
          status: 'completed',
        },
      ],
      agents: [
        {
          id: 'bob',
          name: 'Bob',
          squadType: 'orchestrator' as SquadType,
          role: 'Orchestrator',
          status: 'working',
          currentTask: 'Analisando demanda...',
        },
      ],
    };

    setState({
      mission: initialMission,
      operations: [{
        id: 'op-orchestrator',
        missionId: 'live',
        agentName: 'Bob',
        squadType: 'orchestrator' as SquadType,
        action: 'Analisando demanda e selecionando squads',
        status: 'running',
        startedAt: new Date().toISOString(),
      }],
      isRunning: true,
      taskId: null,
      error: null,
    });

    try {
      // Create task
      const resp = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demand }),
      });
      if (!resp.ok) throw new Error('Failed to create task');
      const { taskId } = await resp.json();

      setState(prev => ({ ...prev, taskId }));

      // Track agent nodes that have been created for each step
      const stepNodeMap = new Map<string, string>(); // stepId → nodeId

      // Connect SSE with reconnection support
      const connectSSE = (taskIdToConnect: string) => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const es = new EventSource(`${API_BASE}/tasks/${taskIdToConnect}/stream`);
        eventSourceRef.current = es;

        const events = [
          'task:state', 'task:analyzing', 'task:squads-selected', 'task:planning',
          'task:squad-planned', 'task:workflow-created', 'task:executing',
          'step:started', 'step:completed', 'step:streaming:start',
          'step:streaming:chunk', 'step:streaming:end',
          'task:completed', 'task:failed',
        ];

        events.forEach(eventType => {
          es.addEventListener(eventType, (e: MessageEvent) => {
            try {
              const data = JSON.parse(e.data);
              // Reset reconnect counter on successful message
              reconnectAttemptRef.current = 0;
              handleEvent(eventType, data, stepNodeMap);
            } catch (err) {
              console.error('SSE parse error:', err);
            }
          });
        });

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;

          // Auto-reconnect with exponential backoff
          if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
            const attempt = reconnectAttemptRef.current;
            reconnectAttemptRef.current = attempt + 1;
            const delay = Math.min(1000 * Math.pow(2, attempt), 8000); // 1s, 2s, 4s

            setState(prev => ({
              ...prev,
              error: `Conexão perdida. Reconectando em ${delay / 1000}s... (${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})`,
            }));

            reconnectTimerRef.current = setTimeout(() => {
              connectSSE(taskIdToConnect);
            }, delay);
          } else {
            setState(prev => ({
              ...prev,
              isRunning: false,
              error: 'Conexão perdida após várias tentativas. Verifique sua conexão.',
            }));
          }
        };
      };

      connectSSE(taskId);
    } catch (err) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleEvent is stable (uses setState updater) and adding it would re-create SSE listeners unnecessarily
  }, [close]);

  const handleEvent = useCallback((eventType: string, data: Record<string, unknown>, stepNodeMap: Map<string, string>) => {
    setState(prev => {
      if (!prev.mission) return prev;
      const m = { ...prev.mission, nodes: [...prev.mission.nodes], edges: [...prev.mission.edges], agents: [...prev.mission.agents] };
      let ops = [...prev.operations];
      let isRunning = prev.isRunning;

      switch (eventType) {
        case 'task:analyzing': {
          m.progress = 5;
          // Update orchestrator node
          m.nodes = m.nodes.map(n =>
            n.id === 'node-orchestrator'
              ? { ...n, currentAction: 'Analisando demanda...', progress: 10 }
              : n
          );
          break;
        }

        case 'task:planning': {
          m.progress = 15;
          m.nodes = m.nodes.map(n =>
            n.id === 'node-orchestrator'
              ? { ...n, currentAction: 'Planejando execução...', progress: 50 }
              : n
          );
          break;
        }

        case 'task:squad-planned': {
          const squadId = data.squadId as string;
          const chief = data.chief as string;
          const agents = (data.agents || []) as Array<{ id: string; name: string }>;
          const squadType = getSquadType(squadId);

          // Complete orchestrator node
          m.nodes = m.nodes.map(n =>
            n.id === 'node-orchestrator'
              ? { ...n, status: 'completed' as const, progress: 100, currentAction: 'Squads selecionados' }
              : n
          );

          // Calculate positions for squad nodes
          const existingAgentNodes = m.nodes.filter(n => n.type === 'agent' && n.id !== 'node-orchestrator');
          const colBase = START_X + NODE_SPACING_X * 2;
          const chiefY = START_Y;

          // Chief node
          const chiefNodeId = `node-chief-${squadId}`;
          m.nodes.push({
            id: chiefNodeId,
            type: 'agent',
            label: chief || 'Chief',
            agentName: chief,
            squadType,
            status: 'waiting',
            position: { x: colBase + existingAgentNodes.length * 40, y: chiefY },
            progress: 0,
            currentAction: 'Aguardando...',
          });

          // Edge from orchestrator to chief
          m.edges.push({
            id: buildEdgeId('node-orchestrator', chiefNodeId),
            source: 'node-orchestrator',
            target: chiefNodeId,
            status: 'active',
            animated: true,
          });

          // Agent nodes branching from chief
          agents.forEach((agent, idx) => {
            if (agent.id === chief) return; // Skip chief itself
            const agentNodeId = `node-agent-${agent.id}`;
            const yOffset = (idx - Math.floor(agents.length / 2)) * NODE_SPACING_Y;

            m.nodes.push({
              id: agentNodeId,
              type: 'agent',
              label: agent.name || agent.id,
              agentName: agent.name || agent.id,
              squadType,
              status: 'idle',
              position: {
                x: colBase + NODE_SPACING_X + existingAgentNodes.length * 40,
                y: chiefY + yOffset,
              },
              progress: 0,
            });

            // Edge from chief to agent
            m.edges.push({
              id: buildEdgeId(chiefNodeId, agentNodeId),
              source: chiefNodeId,
              target: agentNodeId,
              status: 'idle',
            });

            // Add to agents list
            m.agents.push({
              id: agent.id,
              name: agent.name || agent.id,
              squadType,
              role: 'specialist',
              status: 'waiting',
              currentTask: 'Aguardando...',
            });
          });

          // Add chief to agents list
          m.agents.push({
            id: chief,
            name: chief,
            squadType,
            role: 'chief',
            status: 'waiting',
            currentTask: 'Aguardando...',
          });

          // Add operation
          ops.push({
            id: `op-squad-${squadId}`,
            missionId: 'live',
            agentName: chief,
            squadType,
            action: `Squad ${squadId} planejado com ${agents.length} agentes`,
            status: 'completed',
            startedAt: new Date().toISOString(),
          });

          m.progress = 25;
          break;
        }

        case 'task:workflow-created': {
          const steps = (data.steps || []) as Array<{ id: string; name: string }>;

          // Create review + end nodes
          const maxX = Math.max(...m.nodes.map(n => n.position.x));
          const reviewX = maxX + NODE_SPACING_X;

          m.nodes.push(
            {
              id: 'node-review',
              type: 'checkpoint',
              label: 'Revisão Final',
              status: 'idle',
              position: { x: reviewX, y: START_Y },
            },
            {
              id: 'node-end',
              type: 'end',
              label: 'Concluído',
              status: 'idle',
              position: { x: reviewX + NODE_SPACING_X, y: START_Y },
            }
          );

          // Connect leaf agent nodes to review
          const agentNodes = m.nodes.filter(n => n.type === 'agent' && n.id !== 'node-orchestrator' && !n.id.startsWith('node-chief-'));
          const chiefNodes = m.nodes.filter(n => n.id.startsWith('node-chief-'));

          // If there are specialist agent nodes, connect them to review
          // Otherwise connect chiefs to review
          const leafNodes = agentNodes.length > 0 ? agentNodes : chiefNodes;
          leafNodes.forEach(n => {
            m.edges.push({
              id: buildEdgeId(n.id, 'node-review'),
              source: n.id,
              target: 'node-review',
              status: 'idle',
            });
          });

          m.edges.push({
            id: buildEdgeId('node-review', 'node-end'),
            source: 'node-review',
            target: 'node-end',
            status: 'idle',
          });

          // Map step IDs to nodes
          steps.forEach((step, idx) => {
            // Match step name to an existing node
            const stepName = step.name.toLowerCase();
            const matchedNode = m.nodes.find(n => {
              if (n.id === 'node-orchestrator' && idx === 0) return true;
              if (n.agentName && stepName.includes(n.agentName.toLowerCase())) return true;
              return false;
            });
            if (matchedNode) {
              stepNodeMap.set(step.id, matchedNode.id);
            }
          });

          m.progress = 30;
          break;
        }

        case 'task:executing': {
          m.progress = 35;
          break;
        }

        case 'step:started': {
          const stepId = data.stepId as string;
          const nodeId = stepNodeMap.get(stepId);
          if (nodeId) {
            m.nodes = m.nodes.map(n =>
              n.id === nodeId
                ? { ...n, status: 'active' as const, progress: 0, startedAt: new Date().toISOString(), currentAction: 'Processando...' }
                : n
            );
            // Activate incoming edges
            m.edges = m.edges.map(e =>
              e.target === nodeId ? { ...e, status: 'active' as const, animated: true } : e
            );
            // Update agent status
            const node = m.nodes.find(n => n.id === nodeId);
            if (node?.agentName) {
              m.agents = m.agents.map(a =>
                a.name === node.agentName ? { ...a, status: 'working' as const, currentTask: 'Processando...' } : a
              );
            }
          }
          break;
        }

        case 'step:streaming:start': {
          const stepId = data.stepId as string;
          const agentData = data.agent as { id: string; name: string; squad: string } | undefined;
          const stepName = data.stepName as string;

          // If we don't have this step mapped, try to find or create a node
          if (!stepNodeMap.has(stepId) && agentData) {
            const existingNode = m.nodes.find(n =>
              n.agentName?.toLowerCase() === agentData.name.toLowerCase() ||
              n.agentName?.toLowerCase() === agentData.id.toLowerCase()
            );
            if (existingNode) {
              stepNodeMap.set(stepId, existingNode.id);
            }
          }

          const nodeId = stepNodeMap.get(stepId);
          if (nodeId) {
            m.nodes = m.nodes.map(n =>
              n.id === nodeId
                ? { ...n, status: 'active' as const, currentAction: `Gerando resposta...`, progress: 10, startedAt: n.startedAt || new Date().toISOString() }
                : n
            );
            m.agents = m.agents.map(a =>
              a.name === agentData?.name || a.id === agentData?.id
                ? { ...a, status: 'working' as const, currentTask: stepName || 'Gerando resposta...' }
                : a
            );
          }

          // Add operation
          ops.push({
            id: `op-${stepId}`,
            missionId: 'live',
            agentName: agentData?.name || 'Agent',
            squadType: (agentData?.squad ? getSquadType(agentData.squad) : 'orchestrator') as SquadType,
            action: stepName || 'Processando...',
            status: 'running',
            startedAt: new Date().toISOString(),
          });

          break;
        }

        case 'step:streaming:chunk': {
          const stepId = data.stepId as string;
          const accumulated = data.accumulated as string;
          const nodeId = stepNodeMap.get(stepId);
          if (nodeId && accumulated) {
            // Estimate progress based on text length (rough heuristic)
            const progress = Math.min(10 + Math.floor(accumulated.length / 50), 90);
            m.nodes = m.nodes.map(n =>
              n.id === nodeId ? { ...n, progress } : n
            );
          }
          break;
        }

        case 'step:streaming:end':
        case 'step:completed': {
          const stepId = data.stepId as string;
          const nodeId = stepNodeMap.get(stepId);
          // Extract response for enriched nodes
          const responseText = (data.response as string) || (data.accumulated as string) || '';
          const outputSnippet = responseText.length > 500 ? responseText.slice(0, 497) + '...' : responseText;

          if (nodeId) {
            m.nodes = m.nodes.map(n =>
              n.id === nodeId
                ? { ...n, status: 'completed' as const, progress: 100, currentAction: 'Concluído', completedAt: new Date().toISOString(), output: outputSnippet || n.output }
                : n
            );
            // Complete edges from this node
            m.edges = m.edges.map(e =>
              e.source === nodeId ? { ...e, status: 'completed' as const, animated: false } : e
            );
            m.edges = m.edges.map(e =>
              e.target === nodeId ? { ...e, status: 'completed' as const, animated: false } : e
            );
            // Update agent
            const node = m.nodes.find(n => n.id === nodeId);
            if (node?.agentName) {
              m.agents = m.agents.map(a =>
                a.name === node.agentName || a.id === node.agentName
                  ? { ...a, status: 'completed' as const, currentTask: 'Concluído' }
                  : a
              );
            }
          }

          // Update operation
          ops = ops.map(op =>
            op.id === `op-${stepId}` ? { ...op, status: 'completed' as const, duration: Math.floor((Date.now() - new Date(op.startedAt).getTime()) / 1000) } : op
          );

          // Update overall progress
          const totalAgentNodes = m.nodes.filter(n => n.type === 'agent').length;
          const completedAgentNodes = m.nodes.filter(n => n.type === 'agent' && n.status === 'completed').length;
          m.progress = totalAgentNodes > 0 ? Math.floor(30 + (completedAgentNodes / totalAgentNodes) * 60) : m.progress;

          break;
        }

        case 'task:completed': {
          m.status = 'completed';
          m.progress = 100;
          m.completedAt = new Date().toISOString();
          // Complete review + end nodes
          m.nodes = m.nodes.map(n => {
            if (n.id === 'node-review' || n.id === 'node-end') {
              return { ...n, status: 'completed' as const };
            }
            return n;
          });
          // Complete all remaining edges
          m.edges = m.edges.map(e => ({ ...e, status: 'completed' as const, animated: false }));
          // Complete all agents
          m.agents = m.agents.map(a => ({ ...a, status: 'completed' as const, currentTask: 'Concluído' }));
          // Update orchestrator operation
          ops = ops.map(op => op.id === 'op-orchestrator' ? { ...op, status: 'completed' as const } : op);
          isRunning = false;
          close();
          break;
        }

        case 'task:failed': {
          m.status = 'error';
          m.nodes = m.nodes.map(n =>
            n.status === 'active' ? { ...n, status: 'error' as const, currentAction: 'Erro' } : n
          );
          isRunning = false;
          close();
          break;
        }
      }

      // Recalculate tokens
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      m.estimatedTimeRemaining = isRunning ? Math.max(0, 120 - elapsed) : 0;

      return { ...prev, mission: m, operations: ops, isRunning };
    });
  }, [close]);

  return { state, start, reset, close };
}
