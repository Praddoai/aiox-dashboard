'use client';

import { useMemo, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ICON_SIZES } from '@/lib/icons';
import { useAgents } from '@/hooks/use-agents';
import { useUIStore } from '@/stores/uiStore';
import { AgentSprite } from './AgentSprite';
import { RoomFurniture } from './RoomFurniture';
import { RoomEnvironment } from './RoomEnvironment';
import { EmbeddedScreen } from './EmbeddedScreen';
import { SpeechBubble } from './SpeechBubble';
import { InteractionLine } from './InteractionLine';
import { AgentEmotes, FloatingEmote } from './AgentEmotes';
import { InteractiveFurniture } from './InteractiveFurniture';
import { AmbientParticles } from './AmbientParticles';
import { useAgentMovement } from './useAgentMovement';
import { useKeyboardNav } from './useKeyboardNav';
import { useDayNightCycle } from './useDayNightCycle';
import { rooms, domains, furnitureTemplates, ROOM_COLS, ROOM_ROWS } from './world-layout';
import type { DomainId } from './world-layout';
import type { AgentTier, AgentSummary } from '@/types';

interface RoomViewProps {
  roomId: string;
  onBack: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const ROOM_TILE = 56;
const ROOM_W = ROOM_COLS * ROOM_TILE;
const ROOM_H = ROOM_ROWS * ROOM_TILE;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

export function RoomView({ roomId, onBack, zoom, onZoomChange }: RoomViewProps) {
  const { agents, isLoading } = useAgents();
  const { selectedAgentId, setSelectedAgentId } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera pan offset (WASD / arrow keys + drag-to-pan)
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });

  // Emote state
  const [emoteAgent, setEmoteAgent] = useState<{ id: string; x: number; y: number } | null>(null);
  const [floatingEmotes, setFloatingEmotes] = useState<Array<{ id: string; emoteKey: string; x: number; y: number }>>([]);

  const roomConfig = rooms.find((r) => r.squadId === roomId);
  const domain: DomainId = roomConfig?.domain || 'dev';
  const domainCfg = domains[domain];
  const furniture = furnitureTemplates[domain];

  // Day/night ambient tinting
  const dayNight = useDayNightCycle();

  // Keyboard navigation (WASD / arrows → camera pan + Escape)
  useKeyboardNav({
    onPan: useCallback((dx: number, dy: number) => {
      setCameraOffset((prev) => ({
        x: Math.max(-ROOM_W / 2, Math.min(ROOM_W / 2, prev.x + dx)),
        y: Math.max(-ROOM_H / 2, Math.min(ROOM_H / 2, prev.y + dy)),
      }));
    }, []),
    panSpeed: 7,
    onEscape: onBack,
    enabled: true,
  });

  // Drag-to-pan handlers for room view
  const handleRoomPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: cameraOffset.x,
      startPanY: cameraOffset.y,
    };
    setIsDragging(true);
  }, [cameraOffset]);

  const handleRoomPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setCameraOffset({
      x: Math.max(-ROOM_W / 2, Math.min(ROOM_W / 2, dragRef.current.startPanX + dx)),
      y: Math.max(-ROOM_H / 2, Math.min(ROOM_H / 2, dragRef.current.startPanY + dy)),
    });
  }, []);

  const handleRoomPointerUp = useCallback(() => {
    dragRef.current.active = false;
    setIsDragging(false);
  }, []);

  // Movement hook replaces static positioning
  const movementMap = useAgentMovement(agents as unknown as AgentSummary[], domain);

  // Build sorted agent list for rendering
  const sortedAgents = useMemo(() => {
    if (!agents) return [];
    return [...(agents as unknown as AgentSummary[])].sort((a, b) => a.tier - b.tier);
  }, [agents]);

  // Collect interaction lines between chatting agents
  const interactionLines = useMemo(() => {
    const lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> = [];
    const processed = new Set<string>();

    movementMap.forEach((state, agentId) => {
      if (state.activity === 'chatting' && state.targetAgentId) {
        const pairKey = [agentId, state.targetAgentId].sort().join('-');
        if (!processed.has(pairKey)) {
          processed.add(pairKey);
          const targetState = movementMap.get(state.targetAgentId);
          if (targetState) {
            lines.push({
              id: pairKey,
              x1: state.x,
              y1: state.y,
              x2: targetState.x,
              y2: targetState.y,
            });
          }
        }
      }
    });

    return lines;
  }, [movementMap]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  // Right-click on agent to show emote ring
  const handleAgentContextMenu = useCallback((agentId: string, x: number, y: number) => {
    setEmoteAgent({ id: agentId, x, y });
  }, []);

  // Emote selected from ring
  const handleEmote = useCallback((emoteKey: string) => {
    if (!emoteAgent) return;
    const id = `${emoteAgent.id}-${Date.now()}`;
    setFloatingEmotes((prev) => [...prev, { id, emoteKey, x: emoteAgent.x, y: emoteAgent.y }]);
    // Clean up after animation
    setTimeout(() => {
      setFloatingEmotes((prev) => prev.filter((e) => e.id !== id));
    }, 1500);
  }, [emoteAgent]);

  return (
    <div className="h-full flex flex-col">
      {/* Room header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-glass-border flex items-center gap-3">
        <motion.button
          onClick={onBack}
          className="h-8 w-8 flex items-center justify-center rounded-lg glass-subtle hover:bg-glass-10 transition-colors"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>

        <div className="flex items-center gap-2">
          {roomConfig?.icon && <roomConfig.icon size={ICON_SIZES.lg} />}
          <div>
            <h2 className="text-sm font-semibold text-primary">
              {roomConfig?.label || roomId}
            </h2>
            <span
              className="text-[10px] font-medium"
              style={{ color: domainCfg.tileColor }}
            >
              {domainCfg.label} · {agents?.length || 0} agents · {dayNight.period}
            </span>
          </div>
        </div>
      </div>

      {/* Room interior */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onWheel={handleWheel}
        onPointerDown={handleRoomPointerDown}
        onPointerMove={handleRoomPointerMove}
        onPointerUp={handleRoomPointerUp}
        onPointerLeave={handleRoomPointerUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="min-h-full flex items-center justify-center p-6">
          <motion.div
            className="relative rounded-2xl overflow-hidden"
            style={{
              width: ROOM_W,
              height: ROOM_H,
              background: domainCfg.floorColor,
              boxShadow: `inset 0 0 60px ${domainCfg.tileColor}15, 0 8px 32px rgba(0,0,0,0.1)`,
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: zoom, opacity: 1, x: cameraOffset.x, y: cameraOffset.y }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            {/* Floor grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10 [image-rendering:pixelated]"
            >
              {Array.from({ length: ROOM_COLS + 1 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * ROOM_TILE}
                  y1={0}
                  x2={i * ROOM_TILE}
                  y2={ROOM_H}
                  stroke={domainCfg.tileBorder}
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: ROOM_ROWS + 1 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * ROOM_TILE}
                  x2={ROOM_W}
                  y2={i * ROOM_TILE}
                  stroke={domainCfg.tileBorder}
                  strokeWidth="1"
                />
              ))}
            </svg>

            {/* Room border */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: `3px solid ${domainCfg.tileColor}44`,
              }}
            />

            {/* Ambient particles */}
            <AmbientParticles
              domain={domain}
              roomWidth={ROOM_W}
              roomHeight={ROOM_H}
            />

            {/* Walls, windows, clock, plaque */}
            <RoomEnvironment
              domain={domain}
              tileSize={ROOM_TILE}
              roomWidth={ROOM_W}
            />

            {/* Furniture */}
            <RoomFurniture
              items={furniture}
              domain={domain}
              tileSize={ROOM_TILE}
            />

            {/* Embedded animated screens on monitors and projectors */}
            {furniture
              .filter((item) => item.type === 'monitor' || item.type === 'projectorScreen')
              .map((item, i) => (
                <EmbeddedScreen
                  key={`screen-${item.type}-${i}`}
                  domain={domain}
                  type={item.type as 'monitor' | 'projectorScreen'}
                  x={item.x}
                  y={item.y}
                  tileSize={ROOM_TILE}
                />
              ))}

            {/* Interaction lines between chatting agents */}
            {interactionLines.map((line) => (
              <InteractionLine
                key={line.id}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                color={domainCfg.tileColor}
              />
            ))}

            {/* Door / exit indicator */}
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer pb-1"
              onClick={onBack}
              whileHover={{ y: 2 }}
            >
              <svg width="24" height="20" viewBox="0 0 24 20" className="[image-rendering:pixelated]">
                <rect x="4" y="0" width="16" height="18" fill={domainCfg.tileBorder} rx="2" />
                <rect x="6" y="2" width="12" height="14" fill={domainCfg.floorColor} />
                <circle cx="15" cy="10" r="1.5" fill={domainCfg.tileBorder} />
              </svg>
              <span className="text-[7px] mt-0.5 font-mono text-foreground-tertiary">
                EXIT
              </span>
            </motion.div>

            {/* Loading state */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="h-6 w-6 border-2 rounded-full"
                  style={{ borderColor: `${domainCfg.tileColor} transparent` }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}

            {/* Interactive furniture hit areas */}
            {furniture.map((item, i) => (
              <InteractiveFurniture
                key={`interact-${item.type}-${i}`}
                item={item}
                domain={domain}
                tileSize={ROOM_TILE}
                index={i}
              />
            ))}

            {/* Agent sprites with movement */}
            {sortedAgents.map((agent) => {
              const moveState = movementMap.get(agent.id);
              const ax = moveState?.x ?? 0;
              const ay = moveState?.y ?? 0;

              return (
                <AgentSprite
                  key={agent.id}
                  name={agent.name}
                  domain={domain}
                  tier={agent.tier as AgentTier}
                  status="online"
                  x={ax}
                  y={ay}
                  selected={selectedAgentId === agent.id}
                  isChief={agent.tier === 0}
                  onClick={() => setSelectedAgentId(agent.id)}
                  onContextMenu={(ex, ey) => handleAgentContextMenu(agent.id, ex, ey)}
                  facing={moveState?.facing}
                  activity={moveState?.activity}
                  activityLabel={moveState?.activityLabel}
                />
              );
            })}

            {/* Speech bubbles for agents with active bubbles */}
            {sortedAgents.map((agent) => {
              const moveState = movementMap.get(agent.id);
              if (!moveState?.bubble) return null;

              return (
                <SpeechBubble
                  key={`bubble-${agent.id}`}
                  content={moveState.bubble}
                  x={moveState.x}
                  y={moveState.y}
                  color={domainCfg.tileColor}
                />
              );
            })}

            {/* Emote ring (right-click on agent) */}
            <AnimatePresence>
              {emoteAgent && (
                <AgentEmotes
                  x={emoteAgent.x}
                  y={emoteAgent.y}
                  onEmote={handleEmote}
                  onClose={() => setEmoteAgent(null)}
                />
              )}
            </AnimatePresence>

            {/* Floating emotes */}
            {floatingEmotes.map((fe) => (
              <FloatingEmote key={fe.id} emoteKey={fe.emoteKey} x={fe.x} y={fe.y} />
            ))}

            {/* Empty state */}
            {!isLoading && sortedAgents.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs text-tertiary">Nenhum agent nesta sala</p>
              </div>
            )}

            {/* Day/night ambient overlay */}
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl z-[48] mix-blend-multiply transition-[opacity,background] duration-[60s] ease-in-out"
              style={{
                background: dayNight.overlayColor,
                opacity: dayNight.overlayOpacity,
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-2 opacity-40 hover:opacity-80 transition-opacity pointer-events-none z-10"
      >
        <div className="flex gap-0.5">
          {['W', 'A', 'S', 'D'].map((k) => (
            <span
              key={k}
              className="inline-flex items-center justify-center rounded text-[8px] font-mono font-bold size-4"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {k}
            </span>
          ))}
        </div>
        <span className="text-[8px] font-mono text-foreground-tertiary">
          move
        </span>
        <span
          className="inline-flex items-center justify-center rounded text-[7px] font-mono font-bold px-1 bg-[var(--glass-border-color)] border border-[var(--color-border-strong)] text-foreground-secondary"
          style={{
            height: 16,
          }}
        >
          ESC
        </span>
        <span className="text-[8px] font-mono text-foreground-tertiary">
          back
        </span>
      </div>
    </div>
  );
}
