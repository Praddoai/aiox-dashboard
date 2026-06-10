import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, RefreshCw } from 'lucide-react';
import { GlassCard, GlassButton, Badge } from '../ui';
import type { KnowledgeOverview, AgentKnowledge } from '../../hooks/useKnowledge';

// ── Types ──

interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'directory' | 'agent';
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface KnowledgeGraphProps {
  overview: KnowledgeOverview | undefined;
  agentKnowledge: AgentKnowledge[] | undefined;
  agentsBySquad: Record<string, AgentKnowledge[]>;
  onSelectFile?: (path: string) => void;
}

// Colors via CSS custom properties — adapts to AIOX cockpit (lime monochrome) and other themes
const NODE_COLORS = {
  agent: 'var(--chart-donut-1, var(--color-accent, #D1FF00))',
  directory: 'var(--chart-donut-2, var(--color-text-secondary, #858585))',
  file: 'var(--chart-bar-2, var(--color-accent, rgba(209,255,0,0.60)))',
};

const LEGEND = [
  { type: 'agent', color: NODE_COLORS.agent, label: 'Agente' },
  { type: 'directory', color: NODE_COLORS.directory, label: 'Diretorio' },
  { type: 'file', color: NODE_COLORS.file, label: 'Arquivo' },
];

// ── Force layout ──

function computeLayout(nodes: GraphNode[], edges: GraphEdge[], w: number, h: number): GraphNode[] {
  const pos = nodes.map((n) => ({ ...n }));

  // Separate by type
  const agents = pos.filter((n) => n.type === 'agent');
  const dirs = pos.filter((n) => n.type === 'directory');
  const files = pos.filter((n) => n.type === 'file');

  agents.forEach((n, i) => {
    const a = (i / Math.max(agents.length, 1)) * Math.PI * 2;
    n.x = w / 2 + Math.cos(a) * 80;
    n.y = h / 2 + Math.sin(a) * 80;
  });
  dirs.forEach((n, i) => {
    const a = (i / Math.max(dirs.length, 1)) * Math.PI * 2 + 0.3;
    n.x = w / 2 + Math.cos(a) * 180;
    n.y = h / 2 + Math.sin(a) * 180;
  });
  files.forEach((n, i) => {
    const a = (i / Math.max(files.length, 1)) * Math.PI * 2 + 0.1;
    n.x = w / 2 + Math.cos(a) * 280;
    n.y = h / 2 + Math.sin(a) * 280;
  });

  // 50 iterations of force sim
  for (let iter = 0; iter < 50; iter++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f = 800 / (dist * dist);
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        pos[i].x -= fx; pos[i].y -= fy;
        pos[j].x += fx; pos[j].y += fy;
      }
    }
    for (const edge of edges) {
      const a = pos.find((n) => n.id === edge.source);
      const b = pos.find((n) => n.id === edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 120) {
        const f = (dist - 120) * 0.01;
        a.x += (dx / dist) * f; a.y += (dy / dist) * f;
        b.x -= (dx / dist) * f; b.y -= (dy / dist) * f;
      }
    }
    for (const n of pos) {
      const m = n.radius + 10;
      n.x = Math.max(m, Math.min(w - m, n.x));
      n.y = Math.max(m, Math.min(h - m, n.y));
    }
  }
  return pos;
}

// ── Component ──

export function KnowledgeGraph({ overview, agentKnowledge, agentsBySquad, onSelectFile }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const W = 800, H = 600;

  const { nodes, edges } = useMemo(() => {
    const nl: GraphNode[] = [];
    const el: GraphEdge[] = [];
    const seen = new Set<string>();

    for (const agent of (agentKnowledge || []).slice(0, 15)) {
      if (seen.has(agent.agentId)) continue;
      seen.add(agent.agentId);
      nl.push({ id: agent.agentId, label: agent.agentName, type: 'agent', x: 0, y: 0, radius: 14, color: NODE_COLORS.agent });

      if (agent.knowledgePath) {
        const dirId = `dir:${agent.knowledgePath}`;
        if (!seen.has(dirId)) {
          seen.add(dirId);
          nl.push({ id: dirId, label: agent.knowledgePath.split('/').pop() || agent.knowledgePath, type: 'directory', x: 0, y: 0, radius: 10, color: NODE_COLORS.directory });
        }
        el.push({ source: agent.agentId, target: dirId });
      }
    }

    if (overview?.recentFiles) {
      const topDirs = new Set<string>();
      for (const file of overview.recentFiles.slice(0, 20)) {
        const parts = file.path.split('/');
        if (parts.length > 1) {
          const dirId = `dir:${parts[0]}`;
          if (!topDirs.has(parts[0]) && !seen.has(dirId)) {
            topDirs.add(parts[0]);
            seen.add(dirId);
            nl.push({ id: dirId, label: parts[0], type: 'directory', x: 0, y: 0, radius: 10, color: NODE_COLORS.directory });
          }
        }
        const fileId = `file:${file.path}`;
        if (!seen.has(fileId)) {
          seen.add(fileId);
          nl.push({ id: fileId, label: file.name, type: 'file', x: 0, y: 0, radius: 6, color: NODE_COLORS.file });
          if (parts.length > 1 && seen.has(`dir:${parts[0]}`)) {
            el.push({ source: `dir:${parts[0]}`, target: fileId });
          }
        }
      }
    }

    for (const [, sa] of Object.entries(agentsBySquad)) {
      for (let i = 0; i < sa.length - 1; i++) {
        for (let j = i + 1; j < sa.length; j++) {
          if (sa[i].knowledgePath && sa[j].knowledgePath) {
            el.push({ source: `dir:${sa[i].knowledgePath}`, target: `dir:${sa[j].knowledgePath}` });
          }
        }
      }
    }

    return { nodes: nl, edges: el };
  }, [overview, agentKnowledge, agentsBySquad]);

  const positioned = useMemo(() => nodes.length ? computeLayout(nodes, edges, W, H) : [], [nodes, edges]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const hoveredData = positioned.find((n) => n.id === hoveredNode);

  if (nodes.length === 0) {
    return (
      <GlassCard className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-secondary">Sem dados para o grafo</p>
          <p className="text-xs text-tertiary mt-1">Adicione arquivos ao knowledge base para visualizar</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex-1 flex flex-col !p-0 overflow-hidden relative">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(3, z + 0.2))} aria-label="Zoom in">
          <Plus size={14} />
        </GlassButton>
        <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))} aria-label="Zoom out">
          <Minus size={14} />
        </GlassButton>
        <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Reset">
          <RefreshCw size={14} />
        </GlassButton>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3">
        {LEGEND.map((l) => (
          <div key={l.type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-tertiary">{l.label}</span>
          </div>
        ))}
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        className="flex-1 cursor-grab active:cursor-grabbing"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="kg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.5" fill="var(--chart-grid, currentColor)" opacity="0.25" />
          </pattern>
          <filter id="kg-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={W} height={H} fill="url(#kg-grid)" />

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {edges.map((e, i) => {
            const s = positioned.find((n) => n.id === e.source);
            const t = positioned.find((n) => n.id === e.target);
            if (!s || !t) return null;
            const hl = hoveredNode === e.source || hoveredNode === e.target;
            return (
              <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={hl ? 'var(--color-accent, #D1FF00)' : 'var(--color-border-default, #2a2a2c)'}
                strokeOpacity={hl ? 0.6 : 0.35}
                strokeWidth={hl ? 1.5 : 0.5}
                style={{ transition: 'stroke-opacity 0.2s, stroke 0.2s' }}
              />
            );
          })}

          {positioned.map((node, i) => {
            const hovered = hoveredNode === node.id;
            const isAgent = node.type === 'agent';
            return (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.02 }}
                style={{ cursor: node.type === 'file' ? 'pointer' : 'default' }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  if (node.type === 'file' && onSelectFile) onSelectFile(node.id.replace('file:', ''));
                }}
                filter={isAgent || hovered ? 'url(#kg-glow)' : undefined}
              >
                {hovered && <circle cx={node.x} cy={node.y} r={node.radius + 6} fill={node.color} opacity={0.12} />}
                <circle
                  cx={node.x} cy={node.y} r={node.radius}
                  fill="var(--glass-background-card, var(--glass-bg, rgba(15,15,17,0.88)))"
                  stroke={node.color}
                  strokeWidth={hovered ? 2.5 : isAgent ? 2 : 1.5}
                />
                {(node.radius >= 10 || hovered) && (
                  <text
                    x={node.x} y={node.y + node.radius + 12}
                    textAnchor="middle" fontSize="9"
                    fill="var(--color-text-secondary, #9c9c9c)"
                    opacity={hovered ? 0.9 : 0.6}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.label.length > 15 ? node.label.slice(0, 15) + '...' : node.label}
                  </text>
                )}
                <text
                  x={node.x} y={node.y + 3}
                  textAnchor="middle" fontSize={node.radius * 0.9}
                  fill={node.color}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.type === 'agent' ? 'A' : node.type === 'directory' ? 'D' : 'F'}
                </text>
              </motion.g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredData && (
        <div className="absolute bottom-3 left-3 z-10 glass-card px-3 py-2 rounded-xl border border-glass-border">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredData.color }} />
            <span className="text-xs font-medium text-primary">{hoveredData.label}</span>
            <Badge variant="subtle" size="sm">{hoveredData.type}</Badge>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-3 right-3 z-10 text-[10px] text-tertiary flex gap-3">
        <span>{nodes.filter((n) => n.type === 'agent').length} agentes</span>
        <span>{nodes.filter((n) => n.type === 'directory').length} pastas</span>
        <span>{nodes.filter((n) => n.type === 'file').length} arquivos</span>
      </div>
    </GlassCard>
  );
}
