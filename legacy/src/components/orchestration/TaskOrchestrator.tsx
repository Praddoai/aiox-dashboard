'use client';

/**
 * Task Orchestrator Component - Demo-style Interface
 * Beautiful, intuitive, and interactive real-time workflow visualization
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Send,
  Loader2,
  Sparkles,
  Users,
  Bot,
  CheckCircle2,
  AlertCircle,
  Workflow,
  ArrowRight,
  Zap,
  Copy,
  Check,
  Crown,
  Clock,
  Coins,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Eye,
  Terminal,
  Activity,
  Brain,
  Target,
  Layers,
  GitBranch,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSquadInlineStyle } from '@/lib/theme';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// Types
interface TaskEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

interface SquadSelection {
  squadId: string;
  chief: string;
  agentCount: number;
  agents: Array<{ id: string; name: string }>;
}

interface AgentOutput {
  stepId: string;
  stepName: string;
  agent: {
    id: string;
    name: string;
    squad: string;
    title?: string;
  };
  role: string;
  response: string;
  processingTimeMs: number;
  isStreaming?: boolean;
  llmMetadata?: {
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
  };
}

interface StreamingOutput {
  stepId: string;
  stepName: string;
  agent: {
    id: string;
    name: string;
    squad: string;
  };
  role: string;
  accumulated: string;
  startedAt: number;
}

interface TaskState {
  taskId: string | null;
  status: 'idle' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';
  demand: string;
  selectedSquads: string[];
  squadSelections: SquadSelection[];
  workflowId: string | null;
  workflowSteps: Array<{ id: string; name: string }>;
  currentStep: string | null;
  agentOutputs: AgentOutput[];
  streamingOutputs: Map<string, StreamingOutput>;
  error: string | null;
  events: TaskEvent[];
  startTime: number | null;
}

const initialState: TaskState = {
  taskId: null,
  status: 'idle',
  demand: '',
  selectedSquads: [],
  squadSelections: [],
  workflowId: null,
  workflowSteps: [],
  currentStep: null,
  agentOutputs: [],
  streamingOutputs: new Map(),
  error: null,
  events: [],
  startTime: null,
};

const getSquadColor = (squadId: string) => getSquadInlineStyle(squadId);

// Phase configuration
const phases = [
  { id: 'analyzing', label: 'Analisando', icon: Brain, color: 'cyan' },
  { id: 'planning', label: 'Planejando', icon: Target, color: 'purple' },
  { id: 'executing', label: 'Executando', icon: Activity, color: 'orange' },
  { id: 'completed', label: 'Concluido', icon: CheckCircle2, color: 'green' },
];

// Animated background particles
function BackgroundParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-500/30 rounded-full"
          initial={{
            x: Math.random() * 100 + '%',
            y: '100%',
            opacity: 0,
          }}
          animate={{
            y: '-10%',
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// Live metrics component
function LiveMetrics({ state }: { state: TaskState }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state.status === 'idle' || !state.startTime) {
      setElapsed(0);
      return;
    }

    const startTime = state.startTime;
    const interval = setInterval(() => {
      if (state.status === 'completed' || state.status === 'failed') {
        clearInterval(interval);
        return;
      }
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [state.status, state.startTime]);

  const totalTokens = state.agentOutputs.reduce(
    (sum, o) => sum + (o.llmMetadata?.inputTokens || 0) + (o.llmMetadata?.outputTokens || 0),
    0
  );

  const estimatedCost = (totalTokens / 1000000) * 3; // ~$3/1M tokens average

  return (
    <div className="flex items-center gap-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glass-5 border border-glass-10"
      >
        <Clock className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-mono text-foreground-primary">
          {Math.floor(elapsed / 60).toString().padStart(2, '0')}:
          {(elapsed % 60).toString().padStart(2, '0')}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glass-5 border border-glass-10"
      >
        <MessageSquare className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-mono text-foreground-primary">
          {totalTokens.toLocaleString()} tokens
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glass-5 border border-glass-10"
      >
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-mono text-foreground-primary">
          ${estimatedCost.toFixed(4)}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glass-5 border border-glass-10"
      >
        <Bot className="w-4 h-4 text-green-400" />
        <span className="text-sm font-mono text-foreground-primary">
          {state.agentOutputs.length + state.streamingOutputs.size} agentes
        </span>
      </motion.div>
    </div>
  );
}

// Phase progress indicator
function PhaseProgress({ currentStatus }: { currentStatus: TaskState['status'] }) {
  const currentPhaseIndex = phases.findIndex(p => p.id === currentStatus);

  return (
    <div className="flex items-center gap-3">
      {phases.map((phase, index) => {
        const isActive = phase.id === currentStatus;
        const isCompleted = currentPhaseIndex > index || currentStatus === 'completed';
        const isFailed = currentStatus === 'failed';
        const Icon = phase.icon;

        return (
          <div key={phase.id} className="flex items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                isActive
                  ? `bg-${phase.color}-500/20 border border-${phase.color}-500/40 shadow-lg shadow-${phase.color}-500/20`
                  : isCompleted
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-glass-5 border border-glass-10'
              }`}
            >
              {isActive && !isFailed && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(var(--${phase.color}-rgb), 0.1), transparent)`,
                  }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <div className="relative">
                {isActive && !isFailed ? (
                  <Loader2 className={`w-4 h-4 animate-spin text-${phase.color}-400`} />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Icon className="w-4 h-4 text-foreground-tertiary" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive ? `text-${phase.color}-400` : isCompleted ? 'text-green-400' : 'text-foreground-tertiary'
                }`}
              >
                {phase.label}
              </span>
            </motion.div>
            {index < phases.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: currentPhaseIndex > index ? 1 : 0 }}
                className="w-8 h-0.5 bg-gradient-to-r from-green-500 to-green-400 origin-left"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Squad card component
function SquadCard({ selection, isActive }: { selection: SquadSelection; isActive: boolean }) {
  const color = getSquadColor(selection.squadId);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      className="relative p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 cursor-pointer"
      style={{
        backgroundColor: color.bg,
        borderColor: color.border,
        boxShadow: isActive ? `0 0 30px ${color.glow}, 0 0 0 2px ${color.text}` : 'none',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(45deg, transparent, ${color.bg}, transparent)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}
            >
              <Layers className="w-5 h-5" style={{ color: color.text }} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground-primary">{selection.squadId}</h3>
              <p className="text-xs text-foreground-tertiary">Chief: {selection.chief}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: color.bg, color: color.text }}
            >
              {selection.agentCount} agentes
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-foreground-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-foreground-tertiary" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-3 border-t border-glass-10">
                {selection.agents.map((agent) => (
                  <motion.span
                    key={agent.id}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-scrim-20 text-foreground-primary"
                  >
                    {agent.name || agent.id}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Agent output card with streaming support
function AgentOutputCard({
  output,
  streaming,
  index,
  isReviewer,
  onCopy,
  copied,
}: {
  output?: AgentOutput;
  streaming?: StreamingOutput;
  index: number;
  isReviewer: boolean;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const data = output || streaming;
  if (!data) return null;

  const isStreaming = !!streaming;
  const color = getSquadColor(data.agent.squad);
  const response = output?.response || streaming?.accumulated || '';
  const elapsedTime = streaming
    ? ((Date.now() - streaming.startedAt) / 1000).toFixed(1)
    : output?.processingTimeMs
    ? (output.processingTimeMs / 1000).toFixed(1)
    : '0';

  return (
    <motion.div
      initial={{ y: 30, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
      className={`relative rounded-2xl border backdrop-blur-xl overflow-hidden ${
        isReviewer
          ? 'bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-orange-500/10 border-yellow-500/30'
          : isStreaming
          ? 'bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 border-cyan-500/30'
          : 'bg-glass-5 border-glass-10'
      }`}
    >
      {/* Streaming glow effect */}
      {isStreaming && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color.glow}, transparent 70%)`,
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Header */}
      <div
        className="relative flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color.bg, border: `2px solid ${color.border}` }}
              animate={isStreaming ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Bot className="w-6 h-6" style={{ color: color.text }} />
            </motion.div>
            {isStreaming && (
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
            {data.role === 'reviewer' && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-3 h-3 text-yellow-900" />
              </div>
            )}
            {data.role === 'chief' && !isReviewer && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Target className="w-3 h-3 text-foreground-primary" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground-primary">{data.agent.name || data.agent.id}</h3>
              {isStreaming && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400 flex items-center gap-1"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Gerando...
                </motion.span>
              )}
              {isReviewer && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                  Resultado Final
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
              <span style={{ color: color.text }}>{data.agent.squad}</span>
              <span>-</span>
              <span className="capitalize">{data.role}</span>
              <span>-</span>
              <span>{elapsedTime}s</span>
              {output?.llmMetadata && (
                <>
                  <span>-</span>
                  <span>{output.llmMetadata.outputTokens} tokens</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isStreaming && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onCopy(response);
              }}
              className="p-2 rounded-lg bg-glass-5 hover:bg-glass-10 text-foreground-tertiary hover:text-foreground-primary transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </motion.button>
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="p-2 rounded-lg bg-glass-5 text-foreground-tertiary"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div
                className={`p-4 rounded-xl ${
                  isReviewer ? 'bg-scrim-30' : 'bg-scrim-20'
                } border border-glass-5`}
              >
                <div className="text-sm text-foreground-primary whitespace-pre-wrap leading-relaxed">
                  {response}
                  {isStreaming && (
                    <motion.span
                      className="inline-block w-2 h-5 bg-cyan-400 ml-1"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Events panel
function EventsPanel({ events, isActive }: { events: TaskEvent[]; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (containerRef.current && isActive) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, isActive]);

  const displayEvents = showAll ? events : events.slice(-10);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-foreground-primary">Eventos em Tempo Real</h3>
          {isActive && (
            <motion.div
              className="w-2 h-2 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
        {events.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            {showAll ? 'Mostrar menos' : `Ver todos (${events.length})`}
          </button>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto space-y-2 pr-2">
        <AnimatePresence mode="popLayout">
          {displayEvents.map((event, index) => (
            <motion.div
              key={`${event.timestamp}-${index}`}
              initial={{ x: 20, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -20, opacity: 0, scale: 0.95 }}
              className="p-3 rounded-xl bg-glass-5 border border-glass-10 hover:bg-glass-10 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {event.event}
                </span>
                <span className="text-xs text-glass-30 font-mono">
                  {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
              <div className="text-xs text-foreground-tertiary font-mono truncate">
                {JSON.stringify(event.data).substring(0, 100)}
                {JSON.stringify(event.data).length > 100 && '...'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Main component
export default function TaskOrchestrator() {
  const [state, setState] = useState<TaskState>(initialState);
  const [inputValue, setInputValue] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showEvents, setShowEvents] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  const finalResult =
    state.agentOutputs.length > 0
      ? state.agentOutputs.filter((o) => o.role === 'reviewer').pop() ||
        state.agentOutputs[state.agentOutputs.length - 1]
      : null;

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNewTask = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setState(initialState);
    setInputValue('');
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleEventMessage = useCallback((event: MessageEvent, eventType: string) => {
    try {
      const data = JSON.parse(event.data);

      setState((prev) => {
        const newState = { ...prev };
        newState.events = [...prev.events, { event: eventType, data, timestamp: new Date().toISOString() }];

        switch (eventType) {
          case 'task:analyzing':
            newState.status = 'analyzing';
            break;
          case 'task:squads-selected':
            newState.selectedSquads = data.squads || [];
            break;
          case 'task:planning':
            newState.status = 'planning';
            break;
          case 'task:squad-planned':
            newState.squadSelections = [
              ...prev.squadSelections,
              {
                squadId: data.squadId,
                chief: data.chief,
                agentCount: data.agentCount,
                agents: data.agents || [],
              },
            ];
            break;
          case 'task:workflow-created':
            newState.workflowId = data.workflowId;
            newState.workflowSteps = data.steps || [];
            break;
          case 'task:executing':
            newState.status = 'executing';
            break;
          case 'step:started':
            newState.currentStep = data.stepId as string;
            break;
          case 'step:completed':
            if (data.output && (data.output as Record<string, unknown>).agent) {
              const output = data.output as Record<string, unknown>;
              const stepId = data.stepId as string;
              const alreadyExists = prev.agentOutputs.some((o) => o.stepId === stepId);

              if (!alreadyExists) {
                const agentOutput: AgentOutput = {
                  stepId,
                  stepName: (output.stepName as string) || 'Unknown',
                  agent: output.agent as AgentOutput['agent'],
                  role: (output.role as string) || 'specialist',
                  response: (output.response as string) || '',
                  processingTimeMs: (output.processingTimeMs as number) || 0,
                  llmMetadata: output.llmMetadata as AgentOutput['llmMetadata'],
                };
                newState.agentOutputs = [...prev.agentOutputs, agentOutput];
              }

              const newStreamingOutputs = new Map(prev.streamingOutputs);
              newStreamingOutputs.delete(stepId);
              newState.streamingOutputs = newStreamingOutputs;
            }
            break;

          case 'step:streaming:start': {
            const stepId = data.stepId as string;
            const streamingOutput: StreamingOutput = {
              stepId,
              stepName: data.stepName as string,
              agent: data.agent as StreamingOutput['agent'],
              role: data.role as string,
              accumulated: '',
              startedAt: Date.now(),
            };
            const newStreamingOutputs = new Map(prev.streamingOutputs);
            newStreamingOutputs.set(stepId, streamingOutput);
            newState.streamingOutputs = newStreamingOutputs;
            break;
          }

          case 'step:streaming:chunk': {
            const stepId = data.stepId as string;
            const existing = prev.streamingOutputs.get(stepId);
            if (existing) {
              const newStreamingOutputs = new Map(prev.streamingOutputs);
              newStreamingOutputs.set(stepId, {
                ...existing,
                accumulated: data.accumulated as string,
              });
              newState.streamingOutputs = newStreamingOutputs;
            }
            break;
          }

          case 'step:streaming:end': {
            const stepId = data.stepId as string;
            const streaming = prev.streamingOutputs.get(stepId);

            const agentOutput: AgentOutput = {
              stepId,
              stepName: (data.stepName as string) || streaming?.stepName || 'Unknown',
              agent: (data.agent as AgentOutput['agent']) || (streaming?.agent as AgentOutput['agent']),
              role: (data.role as string) || streaming?.role || 'specialist',
              response: (data.response as string) || streaming?.accumulated || '',
              processingTimeMs: streaming ? Date.now() - streaming.startedAt : 0,
              llmMetadata: data.llmMetadata as AgentOutput['llmMetadata'],
            };

            newState.agentOutputs = [...prev.agentOutputs, agentOutput];

            const newStreamingOutputs = new Map(prev.streamingOutputs);
            newStreamingOutputs.delete(stepId);
            newState.streamingOutputs = newStreamingOutputs;
            break;
          }

          case 'task:completed':
            newState.status = 'completed';
            newState.streamingOutputs = new Map();
            break;
          case 'task:failed':
            newState.status = 'failed';
            newState.error = data.error as string;
            break;
        }

        return newState;
      });
    } catch (err) {
      console.error('Error parsing event:', err);
    }
  }, []);

  const connectToSSE = useCallback(
    (taskId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${API_BASE}/tasks/${taskId}/stream`);
      eventSourceRef.current = eventSource;

      const events = [
        'task:state',
        'task:analyzing',
        'task:squads-selected',
        'task:planning',
        'task:squad-planned',
        'task:workflow-created',
        'task:executing',
        'step:started',
        'step:completed',
        'step:streaming:start',
        'step:streaming:chunk',
        'step:streaming:end',
        'task:completed',
        'task:failed',
      ];

      events.forEach((eventType) => {
        eventSource.addEventListener(eventType, (e) => handleEventMessage(e, eventType));
      });

      eventSource.onerror = () => {
        eventSource.close();
      };
    },
    [handleEventMessage]
  );

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    setState({
      ...initialState,
      status: 'analyzing',
      demand: inputValue,
      startTime: Date.now(),
    });

    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demand: inputValue }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const data = await response.json();
      setState((prev) => ({ ...prev, taskId: data.taskId }));
      connectToSSE(data.taskId);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  };

  const isRunning = ['analyzing', 'planning', 'executing'].includes(state.status);

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated background */}
      {isRunning && <BackgroundParticles />}

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-glass-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30"
              animate={isRunning ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Workflow className="w-7 h-7 text-cyan-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-foreground-primary">Orquestrador de Tarefas</h1>
              <p className="text-sm text-foreground-tertiary">Visualizacao em tempo real do fluxo de execucao</p>
            </div>
          </div>

          {isRunning && <LiveMetrics state={state} />}

          {state.status === 'completed' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-3">
              <LiveMetrics state={state} />
              <Button onClick={handleNewTask} variant="outline" className="px-4 py-2">
                <RotateCcw className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            </motion.div>
          )}
        </div>

        {/* Phase Progress */}
        {state.status !== 'idle' && <PhaseProgress currentStatus={state.status} />}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Input & Squads */}
        <div className="w-80 border-r border-glass-10 p-6 flex flex-col gap-6 overflow-auto">
          {/* Input */}
          <div>
            <label className="text-sm font-medium text-foreground-secondary mb-2 block">Sua Demanda</label>
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Descreva o que voce precisa..."
                className="w-full h-32 bg-glass-5 border border-glass-10 rounded-xl px-4 py-3 text-foreground-primary placeholder:text-glass-30 resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                disabled={isRunning}
              />
              <motion.div
                className="absolute bottom-3 right-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isRunning}
                  className="px-4 py-2"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Executar
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Selected Squads */}
          {state.squadSelections.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-medium text-foreground-secondary">Squads Ativados</h3>
              </div>
              <div className="space-y-3">
                {state.squadSelections.map((selection) => (
                  <SquadCard
                    key={selection.squadId}
                    selection={selection}
                    isActive={state.status === 'executing'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Events Toggle */}
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glass-5 border border-glass-10 text-sm text-foreground-secondary hover:bg-glass-10 transition-colors mt-auto"
          >
            <Terminal className="w-4 h-4" />
            {showEvents ? 'Ocultar' : 'Mostrar'} Eventos
            <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
              {state.events.length}
            </span>
          </button>
        </div>

        {/* Center Panel - Agent Outputs */}
        <div className="flex-1 p-6 overflow-auto">
          {state.status === 'idle' ? (
            <div className="h-full flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-md"
              >
                <motion.div
                  className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center border border-cyan-500/20"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Sparkles className="w-16 h-16 text-cyan-400/50" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground-primary mb-3">Pronto para Orquestrar</h2>
                <p className="text-foreground-tertiary leading-relaxed">
                  Digite sua demanda e observe o orquestrador master selecionar squads, delegar para chiefs, e
                  coordenar a execucao dos agentes especialistas em tempo real.
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Streaming outputs first */}
              {Array.from(state.streamingOutputs.values()).map((streaming, index) => (
                <AgentOutputCard
                  key={`streaming-${streaming.stepId}`}
                  streaming={streaming}
                  index={index}
                  isReviewer={false}
                  onCopy={(text) => handleCopy(text, -100 - index)}
                  copied={copiedIndex === -100 - index}
                />
              ))}

              {/* Completed outputs */}
              {state.agentOutputs.map((output, index) => (
                <AgentOutputCard
                  key={output.stepId}
                  output={output}
                  index={index}
                  isReviewer={state.status === 'completed' && output === finalResult}
                  onCopy={(text) => handleCopy(text, index)}
                  copied={copiedIndex === index}
                />
              ))}

              {/* Completion message */}
              {state.status === 'completed' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-foreground-primary mb-2">Tarefa Concluida!</h3>
                  <p className="text-foreground-secondary">
                    {state.agentOutputs.length} agentes executados com sucesso
                  </p>
                </motion.div>
              )}

              {/* Error message */}
              {state.status === 'failed' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 text-center"
                >
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-foreground-primary mb-2">Erro na Execucao</h3>
                  <p className="text-foreground-secondary">{state.error}</p>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Events */}
        <AnimatePresence>
          {showEvents && state.status !== 'idle' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-glass-10 p-6 overflow-hidden"
            >
              <EventsPanel events={state.events} isActive={isRunning} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
