/**
 * AuthorityMatrix — Visual delegation/authority matrix showing which AIOS agents
 * can delegate to or receive work from other agents, plus their exclusive operations.
 *
 * Supports two views: a table-based matrix and a circular graph visualization.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  ArrowRight,
  ArrowLeft,
  Terminal,
  GitBranch,
  Lock,
  LayoutGrid,
  Share2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAgentColor } from '../../lib/agent-colors';
import { aiosRegistry } from '../../data/aios-registry.generated';
import type { AgentDefinition } from '../../data/registry-types';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.25,
      ease: [0, 0, 0.2, 1],
    },
  }),
};

const nodeVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      type: 'spring',
      damping: 20,
      stiffness: 300,
    },
  }),
};

// ---------------------------------------------------------------------------
// AgentBadge — clickable badge showing an agent reference
// ---------------------------------------------------------------------------

function AgentBadge({
  agentId,
  agents,
  isHighlighted,
  onClick,
}: {
  agentId: string;
  agents: Map<string, AgentDefinition>;
  isHighlighted: boolean;
  onClick: (id: string) => void;
}) {
  const agent = agents.get(agentId);
  const color = getAgentColor(agentId);

  return (
    <button
      onClick={() => onClick(agentId)}
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md',
        'border transition-all duration-200',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30',
        isHighlighted
          ? 'bg-white/[0.1] border-white/30 shadow-sm'
          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]'
      )}
      style={{ color }}
      aria-label={`Navigate to agent ${agentId}`}
    >
      {agent && <span className="text-[10px]">{agent.icon}</span>}
      @{agentId}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Matrix View
// ---------------------------------------------------------------------------

function MatrixView({
  agents,
  agentMap,
  selectedAgent,
  onSelectAgent,
}: {
  agents: AgentDefinition[];
  agentMap: Map<string, AgentDefinition>;
  selectedAgent: string | null;
  onSelectAgent: (id: string | null) => void;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[700px] border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Agent
              </div>
            </th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Exclusive Ops
              </div>
            </th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                Delegates To
              </div>
            </th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Receives From
              </div>
            </th>
            <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center justify-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Cmds
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, i) => {
            const color = getAgentColor(agent.id);
            const isSelected = selectedAgent === agent.id;

            return (
              <motion.tr
                key={agent.id}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                onClick={() => onSelectAgent(isSelected ? null : agent.id)}
                className={cn(
                  'border-b border-white/5 cursor-pointer transition-colors duration-150',
                  isSelected
                    ? 'bg-white/[0.06]'
                    : 'hover:bg-white/[0.03]'
                )}
              >
                {/* Agent name + icon */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{
                        background: `${color}15`,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {agent.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white/90 truncate">
                          {agent.name}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                          style={{ background: `${color}15`, color }}
                        >
                          @{agent.id}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 truncate max-w-[180px]">
                        {agent.title}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Exclusive Ops */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {agent.exclusiveOps.length > 0 ? (
                      agent.exclusiveOps.map((op) => (
                        <span
                          key={op}
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md border"
                          style={{
                            color,
                            background: `${color}10`,
                            borderColor: `${color}25`,
                          }}
                        >
                          <Shield className="w-2.5 h-2.5" />
                          {op}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-white/20 italic">none</span>
                    )}
                  </div>
                </td>

                {/* Delegates To */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {agent.delegatesTo.length > 0 ? (
                      agent.delegatesTo.map((id) => (
                        <AgentBadge
                          key={id}
                          agentId={id}
                          agents={agentMap}
                          isHighlighted={selectedAgent === id}
                          onClick={(targetId) => {
                            onSelectAgent(selectedAgent === targetId ? null : targetId);
                          }}
                        />
                      ))
                    ) : (
                      <span className="text-[10px] text-white/20 italic">none</span>
                    )}
                  </div>
                </td>

                {/* Receives From */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {agent.receivesFrom.length > 0 ? (
                      agent.receivesFrom.map((id) => (
                        <AgentBadge
                          key={id}
                          agentId={id}
                          agents={agentMap}
                          isHighlighted={selectedAgent === id}
                          onClick={(targetId) => {
                            onSelectAgent(selectedAgent === targetId ? null : targetId);
                          }}
                        />
                      ))
                    ) : (
                      <span className="text-[10px] text-white/20 italic">none</span>
                    )}
                  </div>
                </td>

                {/* Commands Count */}
                <td className="px-4 py-3 text-center">
                  <span
                    className="inline-flex items-center justify-center text-[11px] font-medium px-2 py-0.5 rounded-md tabular-nums"
                    style={{
                      background: `${color}10`,
                      color: `${color}CC`,
                      border: `1px solid ${color}20`,
                    }}
                  >
                    {agent.commands.length}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Graph View — circular SVG layout with arrows
// ---------------------------------------------------------------------------

interface NodePosition {
  agent: AgentDefinition;
  x: number;
  y: number;
}

function GraphView({
  agents,
  agentMap,
  selectedAgent,
  onSelectAgent,
}: {
  agents: AgentDefinition[];
  agentMap: Map<string, AgentDefinition>;
  selectedAgent: string | null;
  onSelectAgent: (id: string | null) => void;
}) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  const activeAgent = hoveredAgent ?? selectedAgent;

  // Compute node positions in a circle
  const nodes = useMemo<NodePosition[]>(() => {
    const nodeCount = agents.length;
    const radius = 200;
    const centerX = 300;
    const centerY = 260;

    return agents.map((agent, i) => {
      const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { agent, x, y };
    });
  }, [agents]);

  // Build position map for quick lookups
  const nodePositionMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    for (const node of nodes) {
      map.set(node.agent.id, node);
    }
    return map;
  }, [nodes]);

  // Collect all delegation edges
  const edges = useMemo(() => {
    const result: Array<{
      from: string;
      to: string;
      fromPos: NodePosition;
      toPos: NodePosition;
    }> = [];

    for (const node of nodes) {
      for (const targetId of node.agent.delegatesTo) {
        const targetPos = nodePositionMap.get(targetId);
        if (targetPos) {
          result.push({
            from: node.agent.id,
            to: targetId,
            fromPos: node,
            toPos: targetPos,
          });
        }
      }
    }

    return result;
  }, [nodes, nodePositionMap]);

  // Determine which edges are related to the active agent
  const isEdgeActive = useCallback(
    (from: string, to: string) => {
      if (!activeAgent) return false;
      return from === activeAgent || to === activeAgent;
    },
    [activeAgent]
  );

  const isNodeActive = useCallback(
    (id: string) => {
      if (!activeAgent) return false;
      if (id === activeAgent) return true;
      const agent = agentMap.get(activeAgent);
      if (!agent) return false;
      return agent.delegatesTo.includes(id) || agent.receivesFrom.includes(id);
    },
    [activeAgent, agentMap]
  );

  const nodeRadius = 24;
  const svgWidth = 600;
  const svgHeight = 520;

  // Compute shortened line endpoints so arrows don't overlap nodes
  const getEdgePoints = useCallback(
    (fromPos: NodePosition, toPos: NodePosition) => {
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return { x1: fromPos.x, y1: fromPos.y, x2: toPos.x, y2: toPos.y };

      const ux = dx / dist;
      const uy = dy / dist;

      const gap = nodeRadius + 6;
      return {
        x1: fromPos.x + ux * gap,
        y1: fromPos.y + uy * gap,
        x2: toPos.x - ux * (gap + 4),
        y2: toPos.y - uy * (gap + 4),
      };
    },
    []
  );

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center p-4">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-[600px] h-auto"
        aria-label="Agent delegation graph"
      >
        <defs>
          {/* Arrowhead marker for default edges */}
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 8 3 L 0 6 Z" fill="rgba(255,255,255,0.15)" />
          </marker>

          {/* Arrowhead marker for active edges */}
          <marker
            id="arrowhead-active"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 8 3 L 0 6 Z" fill="rgba(255,255,255,0.6)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const pts = getEdgePoints(edge.fromPos, edge.toPos);
          const active = isEdgeActive(edge.from, edge.to);

          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={pts.x1}
              y1={pts.y1}
              x2={pts.x2}
              y2={pts.y2}
              stroke={active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}
              strokeWidth={active ? 2 : 1}
              markerEnd={active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
              className="transition-all duration-300"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const color = getAgentColor(node.agent.id);
          const active = isNodeActive(node.agent.id);
          const isSelf = activeAgent === node.agent.id;
          const dimmed = activeAgent != null && !active;
          const initial = node.agent.name.charAt(0).toUpperCase();

          return (
            <motion.g
              key={node.agent.id}
              custom={i}
              variants={nodeVariants}
              initial="hidden"
              animate="visible"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredAgent(node.agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
              onClick={() =>
                onSelectAgent(selectedAgent === node.agent.id ? null : node.agent.id)
              }
              role="button"
              tabIndex={0}
              aria-label={`Agent ${node.agent.name} (@${node.agent.id})`}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectAgent(selectedAgent === node.agent.id ? null : node.agent.id);
                }
              }}
            >
              {/* Glow ring for active/self */}
              {isSelf && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius + 5}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.4}
                  className="animate-pulse"
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius}
                fill={dimmed ? 'rgba(255,255,255,0.02)' : `${color}20`}
                stroke={dimmed ? 'rgba(255,255,255,0.06)' : `${color}50`}
                strokeWidth={isSelf ? 2 : 1}
                className="transition-all duration-300"
              />

              {/* Agent initial letter */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={dimmed ? 'rgba(255,255,255,0.15)' : color}
                fontSize={14}
                fontWeight={600}
                className="pointer-events-none select-none transition-all duration-300"
              >
                {initial}
              </text>

              {/* Agent id label below node */}
              <text
                x={node.x}
                y={node.y + nodeRadius + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill={dimmed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}
                fontSize={9}
                fontFamily="monospace"
                className="pointer-events-none select-none transition-all duration-300"
              >
                @{node.agent.id}
              </text>

              {/* Exclusive ops count on top-right if any */}
              {node.agent.exclusiveOps.length > 0 && (
                <>
                  <circle
                    cx={node.x + nodeRadius * 0.7}
                    cy={node.y - nodeRadius * 0.7}
                    r={8}
                    fill={dimmed ? 'rgba(255,255,255,0.03)' : `${color}40`}
                    stroke={dimmed ? 'rgba(255,255,255,0.06)' : `${color}60`}
                    strokeWidth={1}
                  />
                  <text
                    x={node.x + nodeRadius * 0.7}
                    y={node.y - nodeRadius * 0.7}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={dimmed ? 'rgba(255,255,255,0.15)' : '#fff'}
                    fontSize={8}
                    fontWeight={700}
                    className="pointer-events-none select-none"
                  >
                    {node.agent.exclusiveOps.length}
                  </text>
                </>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Detail Sidebar (shows when an agent is selected in graph view)
// ---------------------------------------------------------------------------

function AgentSidebar({
  agent,
  agentMap,
  onClose,
  onNavigate,
}: {
  agent: AgentDefinition;
  agentMap: Map<string, AgentDefinition>;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const color = getAgentColor(agent.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex-shrink-0 w-72 border-l border-white/10 bg-white/[0.02] backdrop-blur-sm',
        'overflow-y-auto'
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}30`,
            }}
          >
            {agent.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white/90 truncate">
                {agent.name}
              </span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: `${color}15`, color }}
              >
                @{agent.id}
              </span>
            </div>
            <p className="text-[10px] text-white/40 truncate">{agent.title}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-4">
        {/* Exclusive Ops */}
        {agent.exclusiveOps.length > 0 && (
          <section>
            <h4 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Exclusive Ops
            </h4>
            <div className="space-y-1">
              {agent.exclusiveOps.map((op) => (
                <div
                  key={op}
                  className="text-[10px] font-mono px-2 py-1 rounded border"
                  style={{
                    color,
                    background: `${color}08`,
                    borderColor: `${color}20`,
                  }}
                >
                  {op}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Delegates To */}
        {agent.delegatesTo.length > 0 && (
          <section>
            <h4 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3" />
              Delegates To
            </h4>
            <div className="flex flex-wrap gap-1">
              {agent.delegatesTo.map((id) => (
                <AgentBadge
                  key={id}
                  agentId={id}
                  agents={agentMap}
                  isHighlighted={false}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </section>
        )}

        {/* Receives From */}
        {agent.receivesFrom.length > 0 && (
          <section>
            <h4 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ArrowLeft className="w-3 h-3" />
              Receives From
            </h4>
            <div className="flex flex-wrap gap-1">
              {agent.receivesFrom.map((id) => (
                <AgentBadge
                  key={id}
                  agentId={id}
                  agents={agentMap}
                  isHighlighted={false}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </section>
        )}

        {/* Commands */}
        <section>
          <h4 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Terminal className="w-3 h-3" />
            Commands ({agent.commands.length})
          </h4>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {agent.commands.map((cmd) => (
              <div
                key={cmd.name}
                className="text-[10px] font-mono text-white/40 px-2 py-0.5"
              >
                <span style={{ color }}>*{cmd.name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Close button */}
      <div className="px-4 py-3 border-t border-white/10">
        <button
          onClick={onClose}
          className={cn(
            'w-full text-[11px] text-white/50 py-1.5 rounded-md',
            'border border-white/10 bg-white/[0.03]',
            'hover:bg-white/[0.06] transition-colors',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30'
          )}
          aria-label="Close agent details"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AuthorityMatrix() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'graph'>('matrix');

  const agents = aiosRegistry.agents;

  const agentMap = useMemo(() => {
    const map = new Map<string, AgentDefinition>();
    for (const a of agents) {
      map.set(a.id, a);
    }
    return map;
  }, [agents]);

  const selectedAgentDef = selectedAgent ? agentMap.get(selectedAgent) ?? null : null;

  const handleSelectAgent = useCallback((id: string | null) => {
    setSelectedAgent(id);
  }, []);

  // Summary stats
  const stats = useMemo(() => {
    let totalExclusiveOps = 0;
    let totalDelegations = 0;
    for (const a of agents) {
      totalExclusiveOps += a.exclusiveOps.length;
      totalDelegations += a.delegatesTo.length;
    }
    return { totalExclusiveOps, totalDelegations };
  }, [agents]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ---- Header ---- */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-white/60" />
            <h1 className="text-lg font-semibold text-white/90">Authority Matrix</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats badges */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] text-white/40 px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] tabular-nums">
                {agents.length} agents
              </span>
              <span className="text-[10px] text-white/40 px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] tabular-nums">
                {stats.totalExclusiveOps} exclusive ops
              </span>
              <span className="text-[10px] text-white/40 px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] tabular-nums">
                {stats.totalDelegations} delegations
              </span>
            </div>

            {/* View toggle */}
            <div
              className={cn(
                'flex items-center rounded-lg overflow-hidden',
                'border border-white/10 bg-white/[0.03]'
              )}
            >
              <button
                onClick={() => setViewMode('matrix')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30',
                  viewMode === 'matrix'
                    ? 'bg-white/[0.08] text-white/90'
                    : 'text-white/40 hover:text-white/60'
                )}
                aria-label="Matrix view"
                aria-pressed={viewMode === 'matrix'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Matrix
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30',
                  viewMode === 'graph'
                    ? 'bg-white/[0.08] text-white/90'
                    : 'text-white/40 hover:text-white/60'
                )}
                aria-label="Graph view"
                aria-pressed={viewMode === 'graph'}
              >
                <Share2 className="w-3.5 h-3.5" />
                Graph
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-white/40 leading-relaxed flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
          Agent delegation relationships, exclusive operations, and authority boundaries.
          {selectedAgent && (
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-[10px] text-white/50 underline hover:text-white/70 transition-colors ml-1"
            >
              Clear selection
            </button>
          )}
        </p>
      </div>

      {/* ---- Content ---- */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'matrix' ? (
            <motion.div
              key="matrix"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden"
            >
              <MatrixView
                agents={agents}
                agentMap={agentMap}
                selectedAgent={selectedAgent}
                onSelectAgent={handleSelectAgent}
              />
            </motion.div>
          ) : (
            <motion.div
              key="graph"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex overflow-hidden"
            >
              <GraphView
                agents={agents}
                agentMap={agentMap}
                selectedAgent={selectedAgent}
                onSelectAgent={handleSelectAgent}
              />

              {/* Sidebar when agent selected in graph */}
              <AnimatePresence>
                {selectedAgentDef && (
                  <AgentSidebar
                    agent={selectedAgentDef}
                    agentMap={agentMap}
                    onClose={() => setSelectedAgent(null)}
                    onNavigate={(id) => setSelectedAgent(id)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
