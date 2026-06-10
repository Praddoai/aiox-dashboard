import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AgentSummary, AgentTier } from '../../types';

interface Connection {
  from: string;
  to: string;
  type: string;
}

interface ConnectionsMapProps {
  agents: AgentSummary[];
  connections: Connection[];
}

const tierColors: Record<AgentTier, { fill: string; stroke: string; text: string }> = {
  0: { fill: '#a855f7', stroke: '#a855f740', text: '#e9d5ff' },
  1: { fill: '#3b82f6', stroke: '#3b82f640', text: '#dbeafe' },
  2: { fill: '#22c55e', stroke: '#22c55e40', text: '#dcfce7' },
};

interface NodePos {
  x: number;
  y: number;
  agent: AgentSummary;
}

export function ConnectionsMap({ agents, connections }: ConnectionsMapProps) {
  const layout = useMemo(() => {
    if (agents.length === 0) return [];

    const width = 600;
    const height = 400;
    const cx = width / 2;
    const cy = height / 2;

    // Group by tier and place in concentric rings
    const tiers: AgentTier[] = [0, 1, 2];
    const byTier = tiers.map((t) => agents.filter((a) => a.tier === t));

    const nodes: NodePos[] = [];

    byTier.forEach((group, ti) => {
      if (group.length === 0) return;
      const radius = ti === 0 ? 0 : ti * 120;
      group.forEach((agent, ai) => {
        if (radius === 0) {
          nodes.push({ x: cx, y: cy, agent });
        } else {
          const angle = (2 * Math.PI * ai) / group.length - Math.PI / 2;
          nodes.push({
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
            agent,
          });
        }
      });
    });

    return nodes;
  }, [agents]);

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-secondary text-sm">Nenhuma conexao disponivel</p>
      </div>
    );
  }

  const nodeMap = new Map(layout.map((n) => [n.agent.id, n]));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full overflow-x-auto"
    >
      <svg
        viewBox="0 0 600 400"
        className="w-full max-w-[600px] mx-auto h-auto"
        style={{ minHeight: 300 }}
      >
        <defs>
          <marker
            id="arrow-solid"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.3)" />
          </marker>
          <marker
            id="arrow-dashed"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.15)" />
          </marker>
        </defs>

        {/* Connections */}
        {connections.map((conn, i) => {
          const from = nodeMap.get(conn.from);
          const to = nodeMap.get(conn.to);
          if (!from || !to) return null;

          const isHandoff = conn.type === 'handoffTo';
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) return null;

          const nodeRadius = 22;
          const startX = from.x + (dx / dist) * nodeRadius;
          const startY = from.y + (dy / dist) * nodeRadius;
          const endX = to.x - (dx / dist) * (nodeRadius + 8);
          const endY = to.y - (dy / dist) * (nodeRadius + 8);

          return (
            <motion.line
              key={`${conn.from}-${conn.to}-${i}`}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={isHandoff ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}
              strokeWidth={isHandoff ? 1.5 : 1}
              strokeDasharray={isHandoff ? 'none' : '4 4'}
              markerEnd={isHandoff ? 'url(#arrow-solid)' : 'url(#arrow-dashed)'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
            />
          );
        })}

        {/* Nodes */}
        {layout.map((node, i) => {
          const colors = tierColors[node.agent.tier];
          const initials = node.agent.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <motion.g
              key={node.agent.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              style={{ transformOrigin: `${node.x}px ${node.y}px` }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={22}
                fill={colors.stroke}
                stroke={colors.fill}
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={colors.text}
                fontSize={11}
                fontWeight={600}
                fontFamily="ui-monospace, monospace"
              >
                {initials}
              </text>
              <text
                x={node.x}
                y={node.y + 34}
                textAnchor="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize={10}
              >
                {node.agent.name}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-tertiary">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-white/20" />
          <span>Handoff</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 border-t border-dashed border-white/15" />
          <span>Receives</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500/30 border border-purple-500" />
          <span>T0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500/30 border border-blue-500" />
          <span>T1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500" />
          <span>T2</span>
        </div>
      </div>
    </motion.div>
  );
}
