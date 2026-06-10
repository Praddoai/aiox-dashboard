'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { WorkflowCanvas } from './WorkflowCanvas';
import { WorkflowSidebar } from './WorkflowSidebar';
import { WorkflowMissionDetail } from './WorkflowMissionDetail';
import { cn, formatRelativeTime, getSquadTheme } from '@/lib/utils';
import { useWorkflows, useCreateWorkflow, useExecuteWorkflow, useWorkflowExecutions, useExecuteWorkflowStream, useSmartOrchestration } from '@/hooks/use-workflows';
import { workflowsApi } from '@/services/api';
// TODO: Migrate CreateWorkflowModal from settings/WorkflowManager to dashboard
// import { CreateWorkflowModal } from '@/components/settings/WorkflowManager';
import { WorkflowExecutionLive } from './WorkflowExecutionLive';
import type { WorkflowMission, WorkflowOperation, AgentTool, TokenUsage } from './types';
import type { SquadType } from '@/types';

// Icons
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
  </svg>
);

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const ZoomInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TokenIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3" />
  </svg>
);

// Helper functions
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const formatTokens = (tokens: number): string => {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
};

// Tool definitions
const AGENT_TOOLS: Record<string, AgentTool[]> = {
  orchestrator: [
    { id: 'api', name: 'API', description: 'Integracao com APIs externas', connected: true },
    { id: 'slack', name: 'Slack', description: 'Comunicacao com equipe', connected: true },
    { id: 'notion', name: 'Notion', description: 'Documentacao e wikis', connected: true },
    { id: 'calendar', name: 'Calendar', description: 'Agendamento de tarefas', connected: true },
    { id: 'analytics', name: 'Analytics', description: 'Metricas e dashboards', connected: true },
  ],
  copywriting: [
    { id: 'web-search', name: 'Web Search', description: 'Pesquisa na internet', connected: true },
    { id: 'web-scraper', name: 'Web Scraper', description: 'Extracao de conteudo', connected: true },
    { id: 'docs', name: 'Google Docs', description: 'Edicao de documentos', connected: true },
    { id: 'notion', name: 'Notion', description: 'Base de conhecimento', connected: true },
    { id: 'analytics', name: 'Analytics', description: 'Dados de SEO', connected: false },
  ],
  design: [
    { id: 'figma', name: 'Figma', description: 'Design de interfaces', connected: true },
    { id: 'image-gen', name: 'Image Gen', description: 'Geracao de imagens AI', connected: true },
    { id: 'web-scraper', name: 'Web Scraper', description: 'Referencias visuais', connected: true },
    { id: 'file-system', name: 'File System', description: 'Gerenciamento de assets', connected: true },
    { id: 'notion', name: 'Notion', description: 'Brand guidelines', connected: true },
  ],
  creator: [
    { id: 'image-gen', name: 'Image Gen', description: 'Criacao de visuais', connected: true },
    { id: 'web-search', name: 'Web Search', description: 'Pesquisa de trends', connected: true },
    { id: 'analytics', name: 'Analytics', description: 'Metricas de conteudo', connected: true },
    { id: 'calendar', name: 'Calendar', description: 'Calendario editorial', connected: true },
    { id: 'slack', name: 'Slack', description: 'Comunicacao', connected: false },
  ],
};

// Mock data for simple workflow
const createSimpleMission = (): WorkflowMission => ({
  id: 'mission-001',
  name: 'Campanha de Lancamento Q1',
  description: 'Criacao completa de campanha incluindo copy, design e conteudo para redes sociais',
  status: 'in-progress',
  startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  progress: 45,
  currentNode: 'node-copy-1',
  tokens: { input: 12450, output: 8320, total: 20770 },
  estimatedTimeRemaining: 420,
  nodes: [
    { id: 'node-start', type: 'start', label: 'Inicio', status: 'completed', position: { x: 100, y: 300 } },
    {
      id: 'node-orchestrator', type: 'agent', label: 'Orquestracao', agentName: 'Orion', squadType: 'orchestrator',
      status: 'completed', position: { x: 250, y: 300 }, progress: 100, currentAction: 'Tarefa concluida',
      tools: AGENT_TOOLS.orchestrator, tokens: { input: 2150, output: 1820, total: 3970 },
      startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      output: 'Workflow configurado com sucesso. 5 agents alocados, 4 tarefas principais distribuidas.',
    },
    {
      id: 'node-copy-1', type: 'agent', label: 'Headlines', agentName: 'Luna', squadType: 'copywriting',
      status: 'active', position: { x: 420, y: 180 }, progress: 65, currentAction: 'Escrevendo variacao #3...',
      tools: AGENT_TOOLS.copywriting, tokens: { input: 3200, output: 2150, total: 5350 },
      startedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    },
    {
      id: 'node-copy-2', type: 'agent', label: 'Body Copy', agentName: 'Atlas', squadType: 'copywriting',
      status: 'waiting', position: { x: 420, y: 420 }, progress: 0, currentAction: 'Aguardando headlines...',
      tools: AGENT_TOOLS.copywriting, tokens: { input: 0, output: 0, total: 0 },
    },
    {
      id: 'node-design', type: 'agent', label: 'Visual Design', agentName: 'Maya', squadType: 'design',
      status: 'waiting', position: { x: 600, y: 300 }, progress: 0, currentAction: 'Aguardando copy...',
      tools: AGENT_TOOLS.design, tokens: { input: 0, output: 0, total: 0 },
    },
    {
      id: 'node-creator', type: 'agent', label: 'Conteudo Social', agentName: 'Phoenix', squadType: 'creator',
      status: 'idle', position: { x: 780, y: 300 }, progress: 0,
      tools: AGENT_TOOLS.creator, tokens: { input: 0, output: 0, total: 0 },
    },
    { id: 'node-review', type: 'checkpoint', label: 'Revisao Final', status: 'idle', position: { x: 920, y: 300 } },
    { id: 'node-end', type: 'end', label: 'Concluido', status: 'idle', position: { x: 1050, y: 300 } },
  ],
  edges: [
    { id: 'edge-1', source: 'node-start', target: 'node-orchestrator', status: 'completed' },
    { id: 'edge-2', source: 'node-orchestrator', target: 'node-copy-1', status: 'active', animated: true },
    { id: 'edge-3', source: 'node-orchestrator', target: 'node-copy-2', status: 'active', animated: true },
    { id: 'edge-4', source: 'node-copy-1', target: 'node-design', status: 'idle' },
    { id: 'edge-5', source: 'node-copy-2', target: 'node-design', status: 'idle' },
    { id: 'edge-6', source: 'node-design', target: 'node-creator', status: 'idle' },
    { id: 'edge-7', source: 'node-creator', target: 'node-review', status: 'idle' },
    { id: 'edge-8', source: 'node-review', target: 'node-end', status: 'idle' },
  ],
  agents: [
    { id: 'agent-1', name: 'Orion', squadType: 'orchestrator', role: 'Orchestrator Chief', status: 'completed', currentTask: 'Distribuicao concluida' },
    { id: 'agent-2', name: 'Luna', squadType: 'copywriting', role: 'Creative Writer', status: 'working', currentTask: 'Criando headlines' },
    { id: 'agent-3', name: 'Atlas', squadType: 'copywriting', role: 'Content Strategist', status: 'waiting', currentTask: 'Aguardando' },
    { id: 'agent-4', name: 'Maya', squadType: 'design', role: 'Visual Designer', status: 'waiting', currentTask: 'Aguardando copy' },
    { id: 'agent-5', name: 'Phoenix', squadType: 'creator', role: 'Content Creator', status: 'waiting', currentTask: 'Aguardando assets' },
  ],
});

const createMockMission = (type: 'simple' | 'complex' = 'simple'): WorkflowMission => {
  return createSimpleMission();
};

const createMockOperations = (): WorkflowOperation[] => [
  { id: 'op-1', missionId: 'mission-001', agentName: 'Orion', squadType: 'orchestrator', action: 'Analisando briefing e distribuindo tarefas', status: 'completed', startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), duration: 45 },
  { id: 'op-2', missionId: 'mission-001', agentName: 'Luna', squadType: 'copywriting', action: 'Criando headlines para landing page', status: 'running', startedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  { id: 'op-3', missionId: 'mission-001', agentName: 'Atlas', squadType: 'copywriting', action: 'Aguardando headlines para iniciar body copy', status: 'pending', startedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: 'op-4', missionId: 'mission-001', agentName: 'Maya', squadType: 'design', action: 'Preparando templates visuais', status: 'pending', startedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
];

interface WorkflowViewProps {
  onClose: () => void;
}

export function WorkflowView({ onClose }: WorkflowViewProps) {
  // Fetch real workflows from API
  const { data: realWorkflows, isLoading: isLoadingWorkflows, refetch: refetchWorkflows } = useWorkflows();
  const { data: executions, isLoading: isLoadingExecutions } = useWorkflowExecutions({ limit: 10 });
  const createWorkflowMutation = useCreateWorkflow();
  const executeWorkflowMutation = useExecuteWorkflow();
  const { state: liveExecutionState, isExecuting: isLiveExecuting, execute: executeLive, reset: resetLiveExecution } = useExecuteWorkflowStream();
  const { state: orchestrationState, isOrchestrating, orchestrate: startOrchestration, reset: resetOrchestration } = useSmartOrchestration();
  const [showLiveExecution, setShowLiveExecution] = useState(false);
  const [showOrchestration, setShowOrchestration] = useState(false);

  // Execution dialog state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [pendingWorkflowId, setPendingWorkflowId] = useState<string | null>(null);
  const [demandInput, setDemandInput] = useState('');

  // Smart Orchestration dialog state
  const [showOrchestrationDialog, setShowOrchestrationDialog] = useState(false);
  const [orchestrationDemand, setOrchestrationDemand] = useState('');

  const [activeTab, setActiveTab] = useState<'list' | 'executions' | 'demo'>('list');
  const [workflowType, setWorkflowType] = useState<'simple' | 'complex'>('simple');
  const [mission, setMission] = useState<WorkflowMission>(() => createMockMission('simple'));
  const [operations, setOperations] = useState<WorkflowOperation[]>(createMockOperations);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [showMissionDetail, setShowMissionDetail] = useState(false);

  // Switch workflow type
  const handleWorkflowTypeChange = (type: 'simple' | 'complex') => {
    setWorkflowType(type);
    setMission(createMockMission(type));
    setSelectedNodeId(null);
    setZoom(type === 'complex' ? 0.8 : 1);
  };

  // Handle workflow created from modal
  const handleWorkflowCreated = useCallback(async (data: {
    name: string;
    description: string;
    steps: Array<{
      id: string;
      type: string;
      name: string;
      handler: string;
      config: { squadId: string; agentId: string; role: string; message: string };
      dependsOn?: string[];
    }>;
  }) => {
    try {
      const workflow = await createWorkflowMutation.mutateAsync({
        name: data.name,
        description: data.description,
        stepCount: data.steps.length,
        steps: data.steps.map((s) => ({
          ...s,
          type: s.type as 'task',
        })),
      });
      if (workflow?.id && workflow.status !== 'active') {
        try {
          await workflowsApi.activateWorkflow(workflow.id);
        } catch (activateError) {
          console.warn('Could not activate workflow:', activateError);
        }
      }
      setShowCreateModal(false);
      refetchWorkflows();
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  }, [createWorkflowMutation, refetchWorkflows]);

  // Activate a draft workflow
  const handleActivateWorkflow = async (workflowId: string) => {
    try {
      await workflowsApi.activateWorkflow(workflowId);
      refetchWorkflows();
    } catch (error) {
      console.error('Failed to activate workflow:', error);
    }
  };

  // Open the execute dialog
  const handleOpenExecuteDialog = (workflowId: string) => {
    setPendingWorkflowId(workflowId);
    setDemandInput('');
    setShowExecuteDialog(true);
  };

  // Execute a workflow with live streaming
  const handleExecuteWorkflow = async () => {
    if (!pendingWorkflowId || !demandInput.trim()) return;
    setShowExecuteDialog(false);
    setShowLiveExecution(true);
    executeLive(pendingWorkflowId, { demand: demandInput.trim() });
  };

  // Close live execution modal
  const handleCloseLiveExecution = () => {
    setShowLiveExecution(false);
    resetLiveExecution();
  };

  // Start smart orchestration
  const handleStartOrchestration = async () => {
    if (!orchestrationDemand.trim()) return;
    setShowOrchestrationDialog(false);
    setShowOrchestration(true);
    startOrchestration(orchestrationDemand.trim());
  };

  // Close orchestration modal
  const handleCloseOrchestration = () => {
    setShowOrchestration(false);
    resetOrchestration();
  };

  // Simulate real-time updates
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setMission((prev) => {
        const currentNode = prev.nodes.find((n) => n.id === 'node-copy-1');
        if (currentNode && currentNode.progress !== undefined && currentNode.progress < 100) {
          return {
            ...prev,
            progress: Math.min(prev.progress + 1, 100),
            nodes: prev.nodes.map((n) =>
              n.id === 'node-copy-1'
                ? { ...n, progress: Math.min((n.progress || 0) + 2, 100) }
                : n
            ),
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleReset = () => {
    setMission(createMockMission(workflowType));
    setOperations(createMockOperations());
    setSelectedNodeId(null);
  };

  const selectedNode = selectedNodeId
    ? mission.nodes.find((n) => n.id === selectedNodeId)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-scrim-40 backdrop-blur-md" onClick={onClose} />

      {/* Main Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 m-4 flex-1 flex flex-col backdrop-blur-2xl border border-glass-20 rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 0% 100%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 50% 60% at 100% 0%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 70%),
            rgba(30, 30, 40, 0.65)
          `,
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Top Tab Bar */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-glass-15 bg-glass-5">
          <div className="flex items-center gap-6">
            <h2 className="text-foreground-primary font-semibold">Workflows</h2>

            {/* Main Tabs */}
            <div className="flex gap-1 p-1 bg-glass-8 rounded-lg border border-glass-10">
              <button
                onClick={() => setActiveTab('list')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-all',
                  activeTab === 'list' ? 'bg-glass-10 text-foreground-primary' : 'text-foreground-tertiary hover:text-foreground-secondary'
                )}
              >
                Workflows
              </button>
              <button
                onClick={() => setActiveTab('executions')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-all',
                  activeTab === 'executions' ? 'bg-glass-10 text-foreground-primary' : 'text-foreground-tertiary hover:text-foreground-secondary'
                )}
              >
                Execucoes
                {executions && executions.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-glass-10 rounded-full">
                    {executions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('demo')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-all',
                  activeTab === 'demo' ? 'bg-glass-10 text-foreground-primary' : 'text-foreground-tertiary hover:text-foreground-secondary'
                )}
              >
                Demo
              </button>
            </div>
          </div>

          <Button variant="glass-ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <CloseIcon />
          </Button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'list' ? (
          <div className="flex-1 overflow-auto p-6">
            {isLoadingWorkflows ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-2 border-glass-20 border-t-glass-60 rounded-full" />
              </div>
            ) : realWorkflows && realWorkflows.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-foreground-secondary">{realWorkflows.length} workflow(s) encontrado(s)</p>
                  <div className="flex gap-2">
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => {
                        setOrchestrationDemand('');
                        setShowOrchestrationDialog(true);
                      }}
                      className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/30"
                    >
                      Orquestrar
                    </Button>
                    <Button variant="glass-ghost" size="sm" onClick={() => setShowCreateModal(true)}>
                      + Criar Workflow
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4">
                  {realWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="p-4 rounded-xl border border-glass-15 bg-glass-8 hover:bg-glass-12 transition-all backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-foreground-primary font-medium">{workflow.name}</h3>
                          <p className="text-foreground-secondary text-sm mt-1">{workflow.description || 'Sem descricao'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {workflow.status}
                          </Badge>
                          {workflow.status === 'draft' && (
                            <Button variant="glass-ghost" size="sm" onClick={() => handleActivateWorkflow(workflow.id)} className="ml-2">
                              Ativar
                            </Button>
                          )}
                          {workflow.status === 'active' && (
                            <Button
                              variant="glass-primary"
                              size="sm"
                              onClick={() => handleOpenExecuteDialog(workflow.id)}
                              disabled={executeWorkflowMutation.isPending}
                              className="ml-2"
                            >
                              <PlayIcon />
                              <span className="ml-1">Executar</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-foreground-tertiary">
                        <span>{workflow.stepCount} steps</span>
                        <span>-</span>
                        <span>Trigger: {workflow.trigger?.type || 'manual'}</span>
                        <span>-</span>
                        <span>Criado {formatRelativeTime(workflow.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-glass-10 border border-glass-10 flex items-center justify-center mb-6">
                  <RefreshIcon />
                </div>
                <h3 className="text-xl font-semibold text-foreground-primary mb-2">Nenhum workflow criado</h3>
                <p className="text-foreground-secondary mb-6 max-w-md">
                  Workflows permitem automatizar tarefas complexas coordenando multiplos agents.
                  Crie seu primeiro workflow ou veja uma demonstracao.
                </p>
                <div className="flex gap-3">
                  <Button variant="glass-primary" onClick={() => setShowCreateModal(true)}>
                    + Criar Workflow
                  </Button>
                  <Button variant="glass-ghost" onClick={() => setActiveTab('demo')}>
                    Ver Demonstracao
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'executions' ? (
          <div className="flex-1 overflow-auto p-6">
            {isLoadingExecutions ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-2 border-glass-20 border-t-glass-60 rounded-full" />
              </div>
            ) : executions && executions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-foreground-secondary">{executions.length} execucao(oes)</p>
                  <Button variant="glass-ghost" size="sm" onClick={() => refetchWorkflows()}>
                    <RefreshIcon />
                    <span className="ml-1">Atualizar</span>
                  </Button>
                </div>
                <div className="grid gap-3">
                  {executions.map((execution) => (
                    <div key={execution.id} className="p-4 rounded-xl border border-glass-10 bg-glass-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-foreground-primary font-medium">{execution.workflowName || 'Workflow'}</h3>
                          <p className="text-foreground-tertiary text-xs mt-1 font-mono">{execution.id}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {execution.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-foreground-tertiary">
                        <span>Iniciado {formatRelativeTime(execution.startedAt)}</span>
                        {execution.completedAt && (
                          <>
                            <span>-</span>
                            <span>Concluido {formatRelativeTime(execution.completedAt)}</span>
                          </>
                        )}
                      </div>
                      {execution.error && (
                        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                          <p className="text-red-400 text-xs">{execution.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <h3 className="text-xl font-semibold text-foreground-primary mb-2">Nenhuma execucao</h3>
                <p className="text-foreground-secondary mb-6 max-w-md">
                  Execute um workflow para ver o historico de execucoes aqui.
                </p>
                <Button variant="glass-ghost" onClick={() => setActiveTab('list')}>
                  Ver Workflows
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Demo Tab */
          <div className="flex-1 flex overflow-hidden">
            <WorkflowSidebar
              mission={mission}
              operations={operations}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onViewMission={() => setShowMissionDetail(true)}
            />

            <div className="flex-1 flex flex-col">
              <div className="h-12 px-4 flex items-center justify-between border-b border-glass-10">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 p-1 bg-glass-5 rounded-lg">
                    <button
                      onClick={() => handleWorkflowTypeChange('simple')}
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium transition-all',
                        workflowType === 'simple' ? 'bg-glass-10 text-foreground-primary' : 'text-foreground-tertiary hover:text-foreground-secondary'
                      )}
                    >
                      Simples
                    </button>
                    <button
                      onClick={() => handleWorkflowTypeChange('complex')}
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium transition-all',
                        workflowType === 'complex' ? 'bg-glass-10 text-foreground-primary' : 'text-foreground-tertiary hover:text-foreground-secondary'
                      )}
                    >
                      Multi-Squad
                    </button>
                  </div>

                  <Badge variant="outline" className={cn(
                    'text-[10px]',
                    mission.status === 'in-progress' ? 'text-orange-400 border-orange-500/30 bg-orange-500/20' : 'text-green-400 border-green-500/30 bg-green-500/20'
                  )}>
                    {mission.status === 'in-progress' ? 'Em execucao' : 'Concluido'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1 p-1 bg-glass-5 rounded-lg">
                    <Button variant={viewMode === 'canvas' ? 'glass-primary' : 'glass-ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('canvas')}>
                      <GridIcon />
                    </Button>
                    <Button variant={viewMode === 'list' ? 'glass-primary' : 'glass-ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('list')}>
                      <ListIcon />
                    </Button>
                  </div>

                  <div className="w-px h-6 bg-glass-10" />

                  <Button variant="glass-ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                    <ZoomOutIcon />
                  </Button>
                  <span className="text-xs text-foreground-secondary w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="glass-ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                    <ZoomInIcon />
                  </Button>

                  <div className="w-px h-6 bg-glass-10" />

                  <Button variant={isPlaying ? 'glass-primary' : 'glass-ghost'} size="icon" className="h-8 w-8" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </Button>

                  <Button variant="glass-ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
                    <RefreshIcon />
                  </Button>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden">
                {viewMode === 'canvas' ? (
                  <WorkflowCanvas
                    nodes={mission.nodes}
                    edges={mission.edges}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                  />
                ) : (
                  <WorkflowListView
                    mission={mission}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                  />
                )}
              </div>

              {/* Bottom Stats Bar */}
              <div className="h-12 px-4 flex items-center justify-between border-t border-glass-15 bg-glass-5">
                <div className="flex items-center gap-6">
                  <Stat label="Progresso Total" value={`${mission.progress}%`} />
                  <Stat label="Agents Ativos" value={mission.agents.filter((a) => a.status === 'working').length.toString()} />
                  <Stat label="Tempo Decorrido" value={formatRelativeTime(mission.startedAt || '')} />
                  {mission.estimatedTimeRemaining && (
                    <Stat label="Tempo Restante" value={formatDuration(mission.estimatedTimeRemaining)} icon={<ClockIcon />} />
                  )}
                  {mission.tokens && (
                    <Stat label="Tokens" value={formatTokens(mission.tokens.total)} icon={<TokenIcon />} />
                  )}
                </div>
              </div>
            </div>

            {/* Right: Node Detail */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-l border-glass-15 overflow-hidden bg-glass-5 backdrop-blur-xl"
                >
                  <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Mission Detail Modal */}
      <AnimatePresence>
        {showMissionDetail && (
          <WorkflowMissionDetail mission={mission} onClose={() => setShowMissionDetail(false)} />
        )}
      </AnimatePresence>

      {/* Execute Workflow Dialog */}
      <AnimatePresence>
        {showExecuteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-overlay"
            onClick={() => setShowExecuteDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl p-6 border border-glass-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(20, 20, 25, 0.98) 100%)',
              }}
            >
              <h3 className="text-xl font-semibold text-foreground-primary mb-2">Executar Workflow</h3>
              <p className="text-sm text-foreground-secondary mb-4">
                Descreva o que voce deseja que o workflow produza. Seja especifico para melhores resultados.
              </p>
              <textarea
                value={demandInput}
                onChange={(e) => setDemandInput(e.target.value)}
                placeholder="Ex: Crie uma campanha de marketing para lancamento de um novo produto..."
                className="w-full h-32 px-4 py-3 rounded-xl text-foreground-primary placeholder-foreground-tertiary resize-none bg-glass-5 border border-glass-10"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="glass-ghost" onClick={() => setShowExecuteDialog(false)}>Cancelar</Button>
                <Button variant="glass-primary" onClick={handleExecuteWorkflow} disabled={!demandInput.trim()}>
                  <PlayIcon />
                  <span className="ml-2">Iniciar Execucao</span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Execution Modal */}
      <AnimatePresence>
        {showLiveExecution && liveExecutionState && (
          <WorkflowExecutionLive state={liveExecutionState} onClose={handleCloseLiveExecution} />
        )}
      </AnimatePresence>

      {/* Smart Orchestration Dialog */}
      <AnimatePresence>
        {showOrchestrationDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-overlay"
            onClick={() => setShowOrchestrationDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl p-6 border border-[rgba(139,92,246,0.3)] shadow-[0_25px_50px_-12px_rgba(139,92,246,0.2)]"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(20, 20, 25, 0.98) 100%)',
              }}
            >
              <h3 className="text-xl font-semibold text-foreground-primary mb-1">Orquestracao Inteligente</h3>
              <p className="text-sm text-foreground-secondary mb-4">O orquestrador vai analisar e criar o workflow automaticamente</p>
              <textarea
                value={orchestrationDemand}
                onChange={(e) => setOrchestrationDemand(e.target.value)}
                placeholder="Descreva o que voce precisa..."
                className="w-full h-40 px-4 py-3 rounded-xl text-foreground-primary placeholder-foreground-tertiary resize-none bg-glass-5 border border-[rgba(139,92,246,0.2)]"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="glass-ghost" onClick={() => setShowOrchestrationDialog(false)}>Cancelar</Button>
                <Button
                  variant="glass-primary"
                  onClick={handleStartOrchestration}
                  disabled={!orchestrationDemand.trim() || orchestrationDemand.trim().length < 10}
                  className="bg-gradient-to-r from-purple-500 to-cyan-500"
                >
                  Iniciar Orquestracao
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Orchestration Live View */}
      <AnimatePresence>
        {showOrchestration && orchestrationState && (
          <WorkflowExecutionLive
            state={orchestrationState.executionState || {
              executionId: null,
              workflowId: orchestrationState.workflowId || '',
              workflowName: orchestrationState.workflowName || 'Analisando...',
              status: orchestrationState.phase === 'analyzing' || orchestrationState.phase === 'planning' ? 'connecting' : 'running',
              steps: [],
              input: { demand: orchestrationState.demand },
            }}
            onClose={handleCloseOrchestration}
            orchestrationPlan={orchestrationState.phase !== 'idle' ? {
              analysis: orchestrationState.analysis,
              expectedOutputs: orchestrationState.expectedOutputs,
              planSteps: orchestrationState.planSteps,
              phase: orchestrationState.phase,
            } : undefined}
          />
        )}
      </AnimatePresence>

      {/* TODO: Create Workflow Modal - uncomment when CreateWorkflowModal is migrated */}
      {/* <AnimatePresence>
        {showCreateModal && (
          <CreateWorkflowModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleWorkflowCreated}
            isLoading={createWorkflowMutation.isPending}
          />
        )}
      </AnimatePresence> */}
    </motion.div>
  );
}

// Helper Components
function Stat({ label, value, icon, tooltip }: { label: string; value: string; icon?: React.ReactNode; tooltip?: string }) {
  return (
    <div className="flex items-center gap-2 group relative" title={tooltip}>
      {icon && <span className="text-foreground-tertiary">{icon}</span>}
      <span className="text-xs text-foreground-tertiary">{label}:</span>
      <span className="text-sm text-foreground-primary font-medium">{value}</span>
    </div>
  );
}

// Icons for NodeDetailPanel
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

function NodeDetailPanel({ node, onClose }: { node: WorkflowMission['nodes'][0]; onClose: () => void }) {
  const getNodeGradient = (squadType: string | undefined): string => {
    if (!squadType) return 'from-blue-500 to-cyan-500';
    const theme = getSquadTheme(squadType as SquadType);
    return theme.gradient;
  };

  const completedTodos = node.todos?.filter((t) => t.status === 'completed').length || 0;
  const totalTodos = node.todos?.length || 0;

  return (
    <div className="h-full flex flex-col w-80 backdrop-blur-xl" style={{
      background: `
        radial-gradient(ellipse 80% 50% at 100% 100%, rgba(140, 60, 180, 0.12) 0%, transparent 50%),
        radial-gradient(ellipse 60% 80% at 0% 0%, rgba(60, 180, 200, 0.10) 0%, transparent 50%),
        rgba(15, 15, 20, 0.65)
      `
    }}>
      <div className="p-4 border-b border-glass-10 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Detalhes do No</h3>
        <Button variant="glass-ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <CloseIcon />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto glass-scrollbar p-4 space-y-4">
        {/* Node Header */}
        <div className="flex items-center gap-3">
          {node.agentName ? (
            <GlassAvatar
              name={node.agentName}
              size="lg"
              squadType={node.squadType as 'copywriting' | 'design' | 'creator' | 'orchestrator' | 'default'}
              status={node.status === 'active' ? 'online' : node.status === 'waiting' ? 'busy' : 'offline'}
            />
          ) : (
            <div className={cn(
              'h-12 w-12 rounded-xl flex items-center justify-center',
              node.type === 'start' && 'bg-green-500/20 text-green-500',
              node.type === 'end' && 'bg-blue-500/20 text-blue-500',
              node.type === 'checkpoint' && 'bg-yellow-500/20 text-yellow-500'
            )}>
              {node.type === 'start' && <PlayIcon />}
              {node.type === 'end' && <CheckIcon />}
              {node.type === 'checkpoint' && <ClockIcon />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-foreground-primary font-semibold">{node.label}</h4>
            {node.agentName && <p className="text-foreground-secondary text-sm">{node.agentName}</p>}
          </div>
        </div>

        {/* Progress */}
        {node.progress !== undefined && (
          <div className="rounded-xl p-3 space-y-2 border border-[rgba(59,130,246,0.2)]" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
          }}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-tertiary">Progresso Total</span>
              <span className="text-foreground-primary font-semibold">{node.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-scrim-30 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full bg-gradient-to-r', getNodeGradient(node.squadType))}
                initial={{ width: 0 }}
                animate={{ width: `${node.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Request */}
        {node.request && (
          <div className="rounded-xl p-3 border border-glass-5" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%)',
          }}>
            <span className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Solicitacao</span>
            <p className="text-sm text-foreground-primary leading-relaxed mt-2">{node.request}</p>
          </div>
        )}

        {/* Current Action */}
        {node.currentAction && node.status === 'active' && (
          <div className="rounded-xl p-3 border border-[rgba(249,115,22,0.2)] border-l-2 border-l-orange-500" style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, transparent 100%)',
          }}>
            <div className="flex items-center gap-2 mb-1">
              <SpinnerIcon />
              <span className="text-xs font-semibold text-orange-400">Acao Atual</span>
            </div>
            <p className="text-sm text-foreground-primary">{node.currentAction}</p>
          </div>
        )}

        {/* Todo List */}
        {node.todos && node.todos.length > 0 && (
          <div className="rounded-xl p-3 border border-glass-5" style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%)',
          }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Todo List</span>
              <Badge variant="outline" className="text-[10px]">{completedTodos}/{totalTodos}</Badge>
            </div>
            <div className="space-y-2">
              {node.todos.map((todo) => (
                <div key={todo.id} className="flex items-start gap-2">
                  <div className={cn(
                    'h-4 w-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
                    todo.status === 'completed' && 'bg-green-500/20 text-green-400',
                    todo.status === 'in-progress' && 'bg-orange-500/20 text-orange-400',
                    todo.status === 'pending' && 'bg-gray-500/20 text-gray-400'
                  )}>
                    {todo.status === 'completed' && <CheckIcon />}
                    {todo.status === 'in-progress' && <SpinnerIcon />}
                  </div>
                  <span className={cn(
                    'text-xs leading-relaxed',
                    todo.status === 'completed' ? 'text-foreground-tertiary line-through' : 'text-foreground-primary'
                  )}>
                    {todo.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output/Result */}
        {node.output && (
          <div className="rounded-xl p-3 border border-[rgba(34,197,94,0.2)] border-l-2 border-l-green-500" style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, transparent 100%)',
          }}>
            <span className="text-xs font-semibold text-green-400">Resultado</span>
            <p className="text-sm text-foreground-primary mt-1">{node.output}</p>
          </div>
        )}

        {/* Token Usage */}
        {node.tokens && node.tokens.total > 0 && (
          <div className="pt-3 mt-3 border-t border-glass-10">
            <span className="text-[10px] font-medium text-foreground-tertiary uppercase tracking-wider">Uso de Tokens</span>
            <div className="rounded-lg p-2 space-y-1.5 mt-2 border border-glass-5" style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)',
            }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-foreground-tertiary">Input</span>
                <span className="text-xs text-foreground-secondary font-medium">{formatTokens(node.tokens.input)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-foreground-tertiary">Output</span>
                <span className="text-xs text-foreground-secondary font-medium">{formatTokens(node.tokens.output)}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-glass-10">
                <span className="text-[10px] text-foreground-tertiary font-medium">Total</span>
                <span className="text-xs text-amber-400 font-semibold">{formatTokens(node.tokens.total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowListView({ mission, selectedNodeId, onSelectNode }: {
  mission: WorkflowMission;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      {mission.nodes.map((node, index) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelectNode(node.id)}
          className={cn(
            'glass-subtle rounded-xl p-4 cursor-pointer transition-all hover:bg-glass-10',
            selectedNodeId === node.id && 'ring-2 ring-blue-500'
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold',
              node.status === 'completed' && 'bg-green-500/20 text-green-500',
              node.status === 'active' && 'bg-orange-500/20 text-orange-500',
              node.status === 'waiting' && 'bg-yellow-500/20 text-yellow-500',
              node.status === 'idle' && 'bg-gray-500/20 text-gray-500'
            )}>
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="text-primary font-medium">{node.label}</p>
              {node.agentName && <p className="text-secondary text-sm">{node.agentName}</p>}
            </div>
            {node.progress !== undefined && (
              <div className="text-right">
                <p className="text-primary text-sm font-medium">{node.progress}%</p>
                <p className="text-tertiary text-xs">{node.status}</p>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
