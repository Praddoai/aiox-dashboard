import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, GitBranch, Users, Zap, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAgentColor } from '../../lib/agent-colors';
import { aiosRegistry } from '../../data/aios-registry.generated';

// ── Types ──

interface AgentRelationship {
  id: string;
  name: string;
  icon: string;
  delegatesTo: string[];
  receivesFrom: string[];
  exclusiveOps: string[];
}

// ── Handoff Visualization ──

export default function HandoffVisualization() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const workflowsWithPhases = useMemo(
    () => aiosRegistry.workflows.filter((w) => w.phases.length > 0),
    [],
  );

  const agentRelationships = useMemo<AgentRelationship[]>(() => {
    return aiosRegistry.agents
      .filter(
        (a) =>
          a.delegatesTo.length > 0 ||
          a.receivesFrom.length > 0 ||
          a.exclusiveOps.length > 0,
      )
      .map((a) => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        delegatesTo: a.delegatesTo,
        receivesFrom: a.receivesFrom,
        exclusiveOps: a.exclusiveOps,
      }));
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-white/90">Handoff Flows</h1>
        <p className="text-xs text-white/40 mt-1">
          Visualize how work flows between agents
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 glass-scrollbar">
        {/* Section 1: Workflow Pipelines */}
        <div className="space-y-6">
          <h2 className="text-sm font-medium text-white/60 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Workflow Pipelines
          </h2>

          {workflowsWithPhases.map((workflow) => {
            const isExpanded = selectedWorkflow === workflow.id;

            return (
              <div
                key={workflow.id}
                className={cn(
                  'border rounded-xl p-4 transition-colors',
                  'bg-white/[0.03] backdrop-blur-sm',
                  isExpanded
                    ? 'border-white/20 bg-white/[0.06]'
                    : 'border-white/10',
                )}
              >
                <button
                  type="button"
                  className="flex items-center justify-between w-full text-left"
                  onClick={() =>
                    setSelectedWorkflow(isExpanded ? null : workflow.id)
                  }
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <h3 className="text-sm font-semibold text-white/90 truncate">
                      {workflow.name}
                    </h3>
                    <p className="text-xs text-white/40 line-clamp-1 mt-0.5">
                      {workflow.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-white/30 tabular-nums">
                      {workflow.phases.length} phases
                    </span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-white/30" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-4 px-1">
                        {workflow.phases.map((phase, i) => {
                          const color = getAgentColor(phase.agent);

                          return (
                            <div key={phase.id} className="contents">
                              {/* Phase node */}
                              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                                  style={{
                                    background: `${color}20`,
                                    color,
                                    border: `2px solid ${color}`,
                                  }}
                                >
                                  {i + 1}
                                </div>
                                <span className="text-[10px] text-white/60 text-center max-w-20 truncate">
                                  {phase.name}
                                </span>
                                <span
                                  className="text-[9px] font-mono"
                                  style={{ color }}
                                >
                                  @{phase.agent}
                                </span>
                              </div>

                              {/* Arrow between phases */}
                              {i < workflow.phases.length - 1 && (
                                <ArrowRight
                                  size={16}
                                  className="text-white/20 flex-shrink-0"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Section 2: Agent Delegation Map */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-white/60 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Agent Delegation Map
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentRelationships.map((agent) => {
              const color = getAgentColor(agent.id);
              const isExpanded = expandedAgent === agent.id;

              return (
                <motion.div
                  key={agent.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'border rounded-xl p-4 transition-colors cursor-pointer',
                    'bg-white/[0.03] backdrop-blur-sm',
                    isExpanded
                      ? 'border-white/20 bg-white/[0.06]'
                      : 'border-white/10 hover:border-white/20',
                  )}
                  onClick={() =>
                    setExpandedAgent(isExpanded ? null : agent.id)
                  }
                >
                  {/* Agent header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{
                        background: `${color}20`,
                        color,
                      }}
                    >
                      {agent.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-white/90">
                        {agent.name}
                      </span>
                      <span
                        className="text-xs ml-2 font-mono"
                        style={{ color }}
                      >
                        @{agent.id}
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                    </motion.div>
                  </div>

                  {/* Quick summary when collapsed */}
                  {!isExpanded && (
                    <div className="flex items-center gap-3 text-[10px] text-white/40">
                      {agent.delegatesTo.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          {agent.delegatesTo.length} delegates
                        </span>
                      )}
                      {agent.receivesFrom.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {agent.receivesFrom.length} sources
                        </span>
                      )}
                      {agent.exclusiveOps.length > 0 && (
                        <span className="flex items-center gap-1">
                          {agent.exclusiveOps.length} exclusive ops
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pt-1">
                          {/* Delegates To */}
                          {agent.delegatesTo.length > 0 && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                                Delegates to
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {agent.delegatesTo.map((targetId) => {
                                  const targetColor = getAgentColor(targetId);
                                  return (
                                    <span
                                      key={targetId}
                                      className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                                      style={{
                                        backgroundColor: `${targetColor}15`,
                                        color: targetColor,
                                        border: `1px solid ${targetColor}30`,
                                      }}
                                    >
                                      <ArrowRight size={8} /> @{targetId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Receives From */}
                          {agent.receivesFrom.length > 0 && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                                Receives from
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {agent.receivesFrom.map((sourceId) => {
                                  const sourceColor = getAgentColor(sourceId);
                                  return (
                                    <span
                                      key={sourceId}
                                      className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                                      style={{
                                        backgroundColor: `${sourceColor}15`,
                                        color: sourceColor,
                                        border: `1px solid ${sourceColor}30`,
                                      }}
                                    >
                                      <Zap size={8} /> @{sourceId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Exclusive Ops */}
                          {agent.exclusiveOps.length > 0 && (
                            <div className="pt-2 border-t border-white/5">
                              <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                                Exclusive operations
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {agent.exclusiveOps.map((op) => (
                                  <code
                                    key={op}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-white/60 border border-white/10"
                                  >
                                    {op}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
