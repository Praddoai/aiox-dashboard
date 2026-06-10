import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  GlassCard,
  GlassButton,
  Badge,
  SectionLabel,
} from '../ui';
import { useBobStore } from '../../stores/bobStore';
import type { Pipeline, BobError } from '../../stores/bobStore';
import PipelineVisualizer from './PipelineVisualizer';
import AgentActivityCard from './AgentActivityCard';
import SurfaceAlerts from './SurfaceAlerts';
import ExecutionLog from './ExecutionLog';

// ---------- Error Card ----------
function ErrorCard({ error }: { error: BobError }) {
  return (
    <GlassCard padding="sm" className="border border-red-500/40">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-red-400 font-medium">{error.message}</p>
          <p className="text-[10px] text-tertiary mt-1">
            Source: {error.source} | {new Date(error.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

// ---------- Demo Pipeline ----------
function createDemoPipeline(): Pipeline {
  return {
    status: 'active',
    currentPhase: 'phase-discovery',
    phases: [
      { id: 'phase-discovery', label: 'Discovery', status: 'in_progress', progress: 0 },
      { id: 'phase-research', label: 'Research', status: 'pending' },
      { id: 'phase-roundtable', label: 'Roundtable', status: 'pending' },
      { id: 'phase-epic', label: 'Create Epic', status: 'pending' },
    ],
    agents: [
      { id: 'agent-aria', name: 'Aria', task: 'Analyzing system architecture', status: 'working' },
      { id: 'agent-atlas', name: 'Atlas', task: 'Waiting for discovery phase', status: 'waiting' },
      { id: 'agent-dex', name: 'Dex', task: 'Waiting for research', status: 'waiting' },
      { id: 'agent-morgan', name: 'Morgan', task: 'Waiting for roundtable', status: 'waiting' },
    ],
    errors: [],
    decisions: [],
  };
}

// ---------- Inactive State ----------
function InactiveState({ onStartDemo }: { onStartDemo: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm"
      >
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl glass-subtle mx-auto mb-4">
          <Cpu className="h-8 w-8 text-tertiary" />
        </div>
        <h2 className="text-lg font-semibold text-primary mb-1">No active orchestration</h2>
        <p className="text-sm text-secondary mb-5">
          Bob orchestration will appear here when a pipeline is running.
        </p>
        <GlassButton variant="primary" onClick={onStartDemo}>
          <Cpu className="h-4 w-4 mr-2" />
          Iniciar Orquestração Demo
        </GlassButton>
      </motion.div>
    </div>
  );
}

// ---------- Elapsed Time Formatter ----------
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ---------- Active State ----------
function ActiveState({
  pipeline,
  onResolveDecision,
}: {
  pipeline: Pipeline;
  onResolveDecision: (id: string) => void;
}) {
  const { executionLog } = useBobStore();
  const currentAgentId = pipeline.agents.find((a) => a.status === 'working')?.id;

  return (
    <div className="flex flex-col gap-6">
      {/* Pipeline Progress */}
      <section>
        <SectionLabel>Pipeline Progress</SectionLabel>
        <PipelineVisualizer pipeline={pipeline} />
      </section>

      {/* Agent Activity */}
      <section>
        <SectionLabel count={pipeline.agents.length}>Agent Activity</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pipeline.agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <AgentActivityCard agent={agent} isCurrent={agent.id === currentAgentId} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Surface Alerts (decisions) */}
      <section>
        <SectionLabel count={pipeline.decisions.filter((d) => !d.resolved).length}>
          Decisions Needed
        </SectionLabel>
        <SurfaceAlerts decisions={pipeline.decisions} onResolve={onResolveDecision} />
      </section>

      {/* Errors */}
      {pipeline.errors.length > 0 && (
        <section>
          <SectionLabel count={pipeline.errors.length}>Errors</SectionLabel>
          <div className="flex flex-col gap-3">
            {pipeline.errors.map((error) => (
              <ErrorCard key={error.id} error={error} />
            ))}
          </div>
        </section>
      )}

      {/* Execution Log */}
      <section>
        <SectionLabel count={executionLog.length}>Execution Log</SectionLabel>
        <ExecutionLog entries={executionLog} />
      </section>
    </div>
  );
}

// ---------- Demo simulation runner ----------
function useDemoSimulation() {
  const { setPipeline, addLogEntry, handleBobEvent, updateElapsed } = useBobStore();

  const startDemo = () => {
    const demoPipeline = createDemoPipeline();
    setPipeline(demoPipeline);

    let elapsed = 0;

    // Phase progression schedule (seconds → action)
    const schedule: Array<{ at: number; action: () => void }> = [
      // Discovery phase progresses
      { at: 2, action: () => addLogEntry({ id: 'log-1', timestamp: new Date().toISOString(), message: 'Starting system architecture analysis...', agent: 'Aria', type: 'action' }) },
      { at: 5, action: () => handleBobEvent({ type: 'BobPhaseChange', data: { phaseId: 'phase-discovery', status: 'completed' } }) },
      { at: 5, action: () => addLogEntry({ id: 'log-2', timestamp: new Date().toISOString(), message: 'Discovery complete. 12 modules identified.', agent: 'Aria', type: 'info' }) },
      { at: 5, action: () => handleBobEvent({ type: 'BobAgentCompleted', data: { agentId: 'agent-aria' } }) },
      // Research phase starts
      { at: 6, action: () => handleBobEvent({ type: 'BobPhaseChange', data: { phaseId: 'phase-research', status: 'in_progress' } }) },
      { at: 6, action: () => addLogEntry({ id: 'log-3', timestamp: new Date().toISOString(), message: 'Researching best practices and competitive analysis...', agent: 'Atlas', type: 'action' }) },
      { at: 8, action: () => handleBobEvent({ type: 'BobSurfaceDecision', data: { id: 'dec-1', message: 'Use microservices or monolith architecture?', severity: 'warning', timestamp: new Date().toISOString(), resolved: false } }) },
      { at: 11, action: () => handleBobEvent({ type: 'BobPhaseChange', data: { phaseId: 'phase-research', status: 'completed' } }) },
      { at: 11, action: () => handleBobEvent({ type: 'BobAgentCompleted', data: { agentId: 'agent-atlas' } }) },
      { at: 11, action: () => addLogEntry({ id: 'log-4', timestamp: new Date().toISOString(), message: 'Research complete. 5 recommendations ready.', agent: 'Atlas', type: 'info' }) },
      // Roundtable phase starts
      { at: 12, action: () => handleBobEvent({ type: 'BobPhaseChange', data: { phaseId: 'phase-roundtable', status: 'in_progress' } }) },
      { at: 12, action: () => addLogEntry({ id: 'log-5', timestamp: new Date().toISOString(), message: 'Cross-functional review started. Evaluating proposals...', agent: 'Dex', type: 'action' }) },
      { at: 16, action: () => handleBobEvent({ type: 'BobPhaseChange', data: { phaseId: 'phase-roundtable', status: 'completed' } }) },
      { at: 16, action: () => handleBobEvent({ type: 'BobAgentCompleted', data: { agentId: 'agent-dex' } }) },
      { at: 16, action: () => addLogEntry({ id: 'log-6', timestamp: new Date().toISOString(), message: 'Roundtable consensus reached. Ready for epic creation.', agent: 'Dex', type: 'info' }) },
      // Create Epic phase
      { at: 17, action: () => handleBobEvent({ type: 'BobPhaseChange', data: { phaseId: 'phase-epic', status: 'in_progress' } }) },
      { at: 17, action: () => addLogEntry({ id: 'log-7', timestamp: new Date().toISOString(), message: 'Creating epic with 8 stories and acceptance criteria...', agent: 'Morgan', type: 'action' }) },
      { at: 21, action: () => handleBobEvent({ type: 'BobPhaseChange', data: { phaseId: 'phase-epic', status: 'completed' } }) },
      { at: 21, action: () => handleBobEvent({ type: 'BobAgentCompleted', data: { agentId: 'agent-morgan' } }) },
      { at: 21, action: () => addLogEntry({ id: 'log-8', timestamp: new Date().toISOString(), message: 'Epic created with 8 stories. Pipeline complete!', agent: 'Morgan', type: 'info' }) },
    ];

    const timer = setInterval(() => {
      elapsed++;
      updateElapsed(elapsed, elapsed);

      // Execute scheduled actions
      schedule
        .filter((s) => s.at === elapsed)
        .forEach((s) => s.action());

      // Stop when all phases are done
      if (elapsed > 22) {
        clearInterval(timer);
        useBobStore.setState((state) => ({
          pipeline: state.pipeline
            ? { ...state.pipeline, status: 'completed' as const }
            : null,
        }));
      }
    }, 1000);

    // Store timer id for cleanup
    return timer;
  };

  return { startDemo };
}

// ---------- Main Component ----------
export default function BobOrchestration() {
  const { isActive, pipeline, sessionElapsed, storyElapsed, setPipeline, resolveDecision } =
    useBobStore();
  const { startDemo } = useDemoSimulation();

  const handleReset = () => {
    setPipeline(null);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6">
      {/* Header (only when active) */}
      {isActive && pipeline && (
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-[#D1FF00]" />
            <h1 className="text-xl font-bold text-primary">Bob Orchestration</h1>
            <Badge
              variant="status"
              status={
                pipeline.status === 'active'
                  ? 'online'
                  : pipeline.status === 'failed'
                    ? 'error'
                    : 'offline'
              }
              size="sm"
            >
              {pipeline.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-secondary font-mono">
              Session: {formatElapsed(sessionElapsed)} | Story: {formatElapsed(storyElapsed)}
            </span>
            <GlassButton
              size="sm"
              variant="ghost"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={handleReset}
            >
              Reset
            </GlassButton>
          </div>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {!isActive || !pipeline ? (
          <motion.div
            key="inactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <InactiveState onStartDemo={startDemo} />
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ActiveState pipeline={pipeline} onResolveDecision={resolveDecision} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
