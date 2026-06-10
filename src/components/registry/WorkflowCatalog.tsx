import { useState, useMemo, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  GitBranch,
  Users,
  ChevronRight,
  ArrowLeft,
  Terminal,
  Search,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAgentColor } from '../../lib/agent-colors';
import { useUIStore } from '../../stores/uiStore';
import { aiosRegistry } from '../../data/aios-registry.generated';
import type { WorkflowDefinition, WorkflowPhase } from '../../data/registry-types';

// ── Workflow Type Badge Colors ──

const TYPE_COLORS: Record<string, string> = {
  generic: '#999999',
  loop: '#f59e0b',
  pipeline: '#0099FF',
  cycle: '#4ADE80',
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? '#696969';
}

// ── Phase Node ──

const PhaseNode = memo(function PhaseNode({
  phase,
  isLast,
}: {
  phase: WorkflowPhase;
  isLast: boolean;
}) {
  const color = getAgentColor(phase.agent);

  return (
    <div className="flex items-start gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-3 h-3 rounded-full border-2 flex-shrink-0"
          style={{ borderColor: color, backgroundColor: `${color}30` }}
        />
        {!isLast && (
          <div className="w-px flex-1 min-h-[24px] bg-white/10" />
        )}
      </div>

      {/* Phase content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] text-white/30 tabular-nums flex-shrink-0">
            Phase {phase.phase}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `${color}20`,
              color,
              border: `1px solid ${color}30`,
            }}
          >
            @{phase.agent}
          </span>
        </div>
        <p className="text-xs text-white/70 truncate">{phase.name}</p>
        {phase.taskFile && (
          <code className="text-[10px] text-white/30 font-mono truncate block mt-0.5">
            {phase.taskFile}
          </code>
        )}
      </div>
    </div>
  );
});

// ── Workflow Card ──

const WorkflowCard = memo(function WorkflowCard({
  workflow,
  isSelected,
  onSelect,
}: {
  workflow: WorkflowDefinition;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const typeColor = getTypeColor(workflow.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onSelect}
      className={cn(
        'border rounded-xl p-4 cursor-pointer transition-colors',
        'bg-white/[0.03] backdrop-blur-sm',
        isSelected
          ? 'border-white/20 bg-white/[0.06]'
          : 'border-white/10 hover:border-white/20',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white/90 truncate flex-1 mr-2">
          {workflow.name}
        </h3>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: `${typeColor}20`,
            color: typeColor,
            border: `1px solid ${typeColor}30`,
          }}
        >
          {workflow.type}
        </span>
      </div>

      <p className="text-xs text-white/50 mb-3 line-clamp-2">
        {workflow.description}
      </p>

      <div className="flex items-center gap-3 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          {workflow.phases.length} phases
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {workflow.agents.length} agents
        </span>
        {workflow.triggers.length > 0 && (
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            {workflow.triggers.length} triggers
          </span>
        )}
        <ChevronRight className="w-3 h-3 ml-auto text-white/20" />
      </div>
    </motion.div>
  );
});

// ── Workflow Detail ──

const WorkflowDetail = memo(function WorkflowDetail({
  workflow,
  onBack,
}: {
  workflow: WorkflowDefinition;
  onBack: () => void;
}) {
  const typeColor = getTypeColor(workflow.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Detail header */}
      <div className="px-4 py-4 border-b border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to catalog
        </button>

        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-white/90">{workflow.name}</h2>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${typeColor}20`,
              color: typeColor,
              border: `1px solid ${typeColor}30`,
            }}
          >
            {workflow.type}
          </span>
        </div>
        <p className="text-xs text-white/50">{workflow.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6" tabIndex={0} role="region" aria-label="Workflow detail">
        {/* Agents involved */}
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-2">
            Agents Involved
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {workflow.agents.map((agent) => {
              const color = getAgentColor(agent);
              return (
                <span
                  key={agent}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${color}20`,
                    color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  @{agent}
                </span>
              );
            })}
          </div>
        </div>

        {/* Triggers */}
        {workflow.triggers.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-2">
              Triggers
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {workflow.triggers.map((trigger) => (
                <code
                  key={trigger}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-white/60 border border-white/10"
                >
                  {trigger}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Phase timeline */}
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-3">
            Phase Pipeline
          </h3>
          <div className="pl-1">
            {workflow.phases.map((phase, idx) => (
              <PhaseNode
                key={phase.id}
                phase={phase}
                isLast={idx === workflow.phases.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ── WorkflowCatalog ──

export default function WorkflowCatalog() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [search, setSearch] = useState('');
  const { registryTargetWorkflowId, clearRegistryTarget } = useUIStore();

  // Auto-select workflow when navigated from another component
  useEffect(() => {
    if (registryTargetWorkflowId) {
      const target = aiosRegistry.workflows.find((w) => w.id === registryTargetWorkflowId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing selection from navigation store
      if (target) setSelectedWorkflow(target);
      clearRegistryTarget();
    }
  }, [registryTargetWorkflowId, clearRegistryTarget]);

  const totalCount = aiosRegistry.workflows.length;

  const filtered = useMemo(() => {
    if (!search) return aiosRegistry.workflows;
    const q = search.toLowerCase();
    return aiosRegistry.workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.type.toLowerCase().includes(q) ||
        w.agents.some((a) => a.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <AnimatePresence mode="wait">
        {selectedWorkflow ? (
          <WorkflowDetail
            key="detail"
            workflow={selectedWorkflow}
            onBack={() => setSelectedWorkflow(null)}
          />
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex flex-col gap-3 px-4 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-white/90">Workflow Catalog</h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 tabular-nums">
                  {filtered.length}/{totalCount}
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workflows by name, type, or agent..."
                  className={cn(
                    'w-full pl-9 pr-3 py-2 text-xs rounded-lg',
                    'bg-white/[0.05] border border-white/10 text-white/80',
                    'placeholder:text-white/30',
                    'focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10',
                    'transition-colors',
                  )}
                />
              </div>
            </div>

            {/* Workflow grid */}
            <div className="flex-1 overflow-y-auto p-4" tabIndex={0} role="region" aria-label="Workflow grid">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/30">
                  <Layers className="w-8 h-8 mb-3 opacity-40" />
                  <p className="text-xs">No workflows match your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      isSelected={false}
                      onSelect={() => setSelectedWorkflow(workflow)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
