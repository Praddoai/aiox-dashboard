import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { ICON_SIZES } from '../../lib/icons';
import { useSquads } from '../../hooks/useSquads';
import { IsometricTile } from './IsometricTile';
import { rooms, TILE_WIDTH, TILE_HEIGHT } from './world-layout';
import type { DomainId, DomainConfig } from './world-layout';
import { useThemedDomains } from './useThemedDomains';

interface WorldMapProps {
  onRoomClick: (roomId: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  highlightedRooms?: string[];
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;

// Domain cluster zones — background regions
interface DomainZone {
  domain: DomainId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const domainZones: DomainZone[] = [
  { domain: 'content', label: 'Content & Marketing', x: -120, y: -20, w: 340, h: 200 },
  { domain: 'sales', label: 'Sales & Ads', x: 170, y: 90, w: 280, h: 200 },
  { domain: 'design', label: 'Design', x: -40, y: 40, w: 180, h: 200 },
  { domain: 'dev', label: 'Product & Dev', x: -280, y: 60, w: 280, h: 190 },
  { domain: 'data', label: 'Data & Strategy', x: -60, y: 200, w: 280, h: 160 },
  { domain: 'ops', label: 'Operations', x: -340, y: 170, w: 340, h: 220 },
];

// Workflow connections — visual links between rooms
interface WorkflowLink {
  from: string;
  to: string;
  label: string;
}

const workflowLinks: WorkflowLink[] = [
  { from: 'content-ecosystem', to: 'copywriting', label: 'Brief' },
  { from: 'copywriting', to: 'creative-studio', label: 'Copy' },
  { from: 'creative-studio', to: 'media-buy', label: 'Creatives' },
  { from: 'media-buy', to: 'data-analytics', label: 'Metrics' },
  { from: 'data-analytics', to: 'conselho', label: 'Insights' },
  { from: 'youtube-content', to: 'social-publisher', label: 'Publish' },
  { from: 'full-stack-dev', to: 'design-system', label: 'Components' },
  { from: 'aios-core-dev', to: 'orquestrador-global', label: 'Deploy' },
  { from: 'funnel-creator', to: 'sales', label: 'Funnel' },
  { from: 'project-management-clickup', to: 'orquestrador-global', label: 'Tasks' },
];

export function WorldMap({ onRoomClick, zoom, onZoomChange, highlightedRooms = [] }: WorldMapProps) {
  const themedDomains = useThemedDomains();
  const { data: squads } = useSquads();
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [filterDomain, setFilterDomain] = useState<DomainId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag-to-pan state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0, didDrag: false });

  // Build squad lookup for agent counts
  const squadMap = useMemo(() => {
    const map = new Map<string, { agentCount: number; status?: string }>();
    squads?.forEach((s) => {
      map.set(s.id, { agentCount: s.agentCount, status: s.status });
    });
    return map;
  }, [squads]);

  // Calculate world bounds from actual room positions for proper centering
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rooms.forEach((room) => {
      const px = (room.gridX - room.gridY) * (TILE_WIDTH / 2);
      const py = (room.gridX + room.gridY) * (TILE_HEIGHT / 2);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px + TILE_WIDTH);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py + TILE_HEIGHT);
    });
    const pad = 80;
    return {
      offsetX: -minX + pad,
      offsetY: -minY + pad,
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2 + 50,
    };
  }, []);

  const filteredRooms = filterDomain
    ? rooms.filter((r) => r.domain === filterDomain)
    : rooms;

  // Room position helper (offset-adjusted for centered world)
  const getRoomPos = useCallback((squadId: string) => {
    const room = rooms.find((r) => r.squadId === squadId);
    if (!room) return null;
    return {
      x: (room.gridX - room.gridY) * (TILE_WIDTH / 2) + TILE_WIDTH / 2 + bounds.offsetX,
      y: (room.gridX + room.gridY) * (TILE_HEIGHT / 2) + TILE_HEIGHT / 2 + bounds.offsetY,
    };
  }, [bounds]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  // Drag-to-pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
      didDrag: false,
    };
    setIsDragging(true);
  }, [panOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.didDrag = true;
    }
    setPanOffset({
      x: dragRef.current.startPanX + dx,
      y: dragRef.current.startPanY + dy,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
    setIsDragging(false);
    // Reset didDrag after click event fires (prevents tile click after drag)
    setTimeout(() => { dragRef.current.didDrag = false; }, 0);
  }, []);

  // Room click that ignores drag gestures
  const handleRoomClickSafe = useCallback((roomId: string) => {
    if (dragRef.current.didDrag) return;
    onRoomClick(roomId);
  }, [onRoomClick]);

  // Total agents across all squads
  const totalAgents = useMemo(() => {
    let total = 0;
    squadMap.forEach((s) => { total += s.agentCount; });
    return total;
  }, [squadMap]);

  const activeRoomCount = useMemo(() => {
    let count = 0;
    squadMap.forEach((s) => { if (s.agentCount > 0) count++; });
    return count;
  }, [squadMap]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with stats */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-primary">AIOS World</h2>
            <div className="flex items-center gap-2 text-[10px] text-tertiary">
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-accent, #4ade80)' }} />
                {totalAgents} agents
              </span>
              <span>|</span>
              <span>{activeRoomCount} active rooms</span>
              <span>|</span>
              <span>{rooms.length} total rooms</span>
            </div>
          </div>
        </div>

        {/* Domain filter bar */}
        <div className="flex items-center gap-2 overflow-x-auto glass-scrollbar pb-1">
          <button
            onClick={() => setFilterDomain(null)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
              !filterDomain
                ? 'glass text-primary shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-white/5'
            )}
          >
            Todos
          </button>
          {Object.values(themedDomains).map((d) => {
            // Count agents in this domain
            const domainRooms = rooms.filter((r) => r.domain === d.id);
            const domainAgents = domainRooms.reduce((sum, r) => sum + (squadMap.get(r.squadId)?.agentCount || 0), 0);
            return (
              <button
                key={d.id}
                onClick={() => setFilterDomain(filterDomain === d.id ? null : d.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                  filterDomain === d.id
                    ? 'shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-white/5'
                )}
                style={filterDomain === d.id ? { background: `${d.tileColor}22`, color: d.tileColor } : undefined}
              >
                <d.icon size={ICON_SIZES.sm} />
                <span>{d.label}</span>
                {domainAgents > 0 && (
                  <span
                    className="ml-0.5 px-1 rounded text-[9px] font-bold"
                    style={{ background: `${d.tileColor}33`, color: d.tileColor }}
                  >
                    {domainAgents}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Isometric world container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="min-h-full flex items-center justify-center p-8">
          <motion.div
            className="relative"
            style={{
              width: bounds.width,
              height: bounds.height,
              transformOrigin: 'center center',
            }}
            animate={{ scale: zoom, x: panOffset.x, y: panOffset.y }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            {/* Domain zone backgrounds */}
            {!filterDomain && domainZones.map((zone) => {
              const d = themedDomains[zone.domain];
              return (
                <motion.div
                  key={zone.domain}
                  className="absolute rounded-2xl pointer-events-none"
                  style={{
                    left: zone.x + bounds.offsetX,
                    top: zone.y + bounds.offsetY,
                    width: zone.w,
                    height: zone.h,
                    background: `radial-gradient(ellipse at center, ${d.tileColor}08 0%, transparent 70%)`,
                    border: `1px solid ${d.tileColor}12`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                />
              );
            })}

            {/* Domain group labels */}
            {!filterDomain && (
              <DomainLabels offsetX={bounds.offsetX} offsetY={bounds.offsetY} domains={themedDomains} />
            )}

            {/* Workflow connection lines */}
            {!filterDomain && (
              <WorkflowLines links={workflowLinks} getRoomPos={getRoomPos} hoveredRoom={hoveredRoom} />
            )}

            {/* Room tiles */}
            {filteredRooms.map((room) => {
              const domainCfg = themedDomains[room.domain];
              const squadInfo = squadMap.get(room.squadId);
              const agentCount = squadInfo?.agentCount || 0;
              const isActive = agentCount > 0;
              const isHovered = hoveredRoom === room.squadId;
              const isWorkflowHighlighted = highlightedRooms.includes(room.squadId);

              return (
                <div
                  key={room.squadId}
                  onMouseEnter={() => setHoveredRoom(room.squadId)}
                  onMouseLeave={() => setHoveredRoom(null)}
                >
                  <IsometricTile
                    col={room.gridX}
                    row={room.gridY}
                    color={domainCfg.tileColor}
                    borderColor={domainCfg.tileBorder}
                    highlighted={isHovered || isWorkflowHighlighted}
                    pulse={isActive || isWorkflowHighlighted}
                    onClick={() => handleRoomClickSafe(room.squadId)}
                    offsetX={bounds.offsetX}
                    offsetY={bounds.offsetY}
                  >
                    <room.icon size={ICON_SIZES.sm} />
                    {/* Activity dots — show agent activity on world map */}
                    {isActive && (
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: Math.min(agentCount, 5) }).map((_, di) => (
                          <motion.div
                            key={di}
                            className="rounded-full"
                            style={{
                              width: 3,
                              height: 3,
                              backgroundColor: domainCfg.tileColor,
                            }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: di * 0.4,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </IsometricTile>

                  {/* Room label + info (below tile) */}
                  <motion.div
                    className="absolute pointer-events-none text-center"
                    style={{
                      left: (room.gridX - room.gridY) * (TILE_WIDTH / 2) + bounds.offsetX - 20,
                      top: (room.gridX + room.gridY) * (TILE_HEIGHT / 2) + bounds.offsetY + TILE_HEIGHT + 2,
                      width: TILE_WIDTH + 40,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0.7 }}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-medium leading-tight block',
                        isHovered ? 'text-primary' : 'text-secondary',
                      )}
                      style={{ fontFamily: '"Press Start 2P", monospace, system-ui', fontSize: '7px' }}
                    >
                      {room.label}
                    </span>
                    {agentCount > 0 && (
                      <span
                        className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold"
                        style={{
                          background: `${domainCfg.tileColor}33`,
                          color: domainCfg.tileColor,
                        }}
                      >
                        {agentCount} agents
                      </span>
                    )}
                  </motion.div>

                  {/* Hover tooltip with room details */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        className="absolute pointer-events-none z-30"
                        style={{
                          left: (room.gridX - room.gridY) * (TILE_WIDTH / 2) + bounds.offsetX - 30,
                          top: (room.gridX + room.gridY) * (TILE_HEIGHT / 2) + bounds.offsetY - 60,
                          width: TILE_WIDTH + 60,
                        }}
                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div
                          className="rounded-lg px-3 py-2 text-center"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(6px)',
                            border: `1px solid ${domainCfg.tileColor}44`,
                          }}
                        >
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <room.icon size={ICON_SIZES.xs} />
                            <span className="text-[10px] font-semibold text-white">
                              {room.label}
                            </span>
                          </div>
                          <div
                            className="text-[8px] font-medium"
                            style={{ color: domainCfg.tileColor }}
                          >
                            {domainCfg.label}
                          </div>
                          <div className="text-[8px] text-white/50 mt-0.5">
                            {agentCount > 0 ? `${agentCount} agents active` : 'No agents'}
                          </div>
                          <div className="text-[7px] text-white/30 mt-0.5">
                            Click to enter
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/** Renders domain cluster labels floating on the world map */
function DomainLabels({ offsetX, offsetY, domains: domainsCfg }: { offsetX: number; offsetY: number; domains: Record<DomainId, DomainConfig> }) {
  const labels: Array<{ domain: DomainId; x: number; y: number }> = [
    { domain: 'content', x: -50, y: -10 },
    { domain: 'sales', x: 230, y: 100 },
    { domain: 'dev', x: -240, y: 70 },
    { domain: 'data', x: 10, y: 210 },
    { domain: 'ops', x: -290, y: 180 },
  ];

  return (
    <>
      {labels.map(({ domain, x, y }) => {
        const d = domainsCfg[domain];
        return (
          <div
            key={domain}
            className="absolute pointer-events-none"
            style={{ left: x + offsetX, top: y + offsetY }}
          >
            <span
              className="text-[9px] font-bold uppercase tracking-widest opacity-30"
              style={{ color: d.tileColor }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </>
  );
}

/** Renders workflow connection lines between rooms */
function WorkflowLines({
  links,
  getRoomPos,
  hoveredRoom,
}: {
  links: WorkflowLink[];
  getRoomPos: (id: string) => { x: number; y: number } | null;
  hoveredRoom: string | null;
}) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {links.map((link) => {
        const from = getRoomPos(link.from);
        const to = getRoomPos(link.to);
        if (!from || !to) return null;

        const isHighlighted = hoveredRoom === link.from || hoveredRoom === link.to;

        return (
          <g key={`${link.from}-${link.to}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={isHighlighted ? 2 : 1}
              strokeDasharray="6 4"
              opacity={isHighlighted ? 0.4 : 0.15}
            >
              {isHighlighted && (
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;20"
                  dur="2s"
                  repeatCount="indefinite"
                />
              )}
            </line>
          </g>
        );
      })}
    </svg>
  );
}
