import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { AgentSummary } from '@/types';
import type { DomainId, FurnitureItem } from './world-layout';
import { furnitureTemplates, ROOM_COLS, ROOM_ROWS } from './world-layout';

// ── Types ──

export type AgentActivity = 'idle' | 'walking' | 'at-furniture' | 'chatting';
export type FacingDirection = 'left' | 'right';
export type BubbleContent = 'thinking' | 'eureka' | 'code' | 'money' | 'chart' | 'chat';

export interface AgentMovementState {
  x: number;
  y: number;
  activity: AgentActivity;
  targetAgentId?: string;
  facing: FacingDirection;
  bubble?: BubbleContent;
  activityLabel?: string;
}

// ── Constants ──

const ROOM_TILE = 56;
// Safe margin from room edges — generous to prevent any overflow
const MARGIN = ROOM_TILE * 1.2;
// Top margin accounts for wall height (100px ≈ 2 tiles)
const MARGIN_TOP = ROOM_TILE * 2.2;
const MAX_X = ROOM_COLS * ROOM_TILE - MARGIN;
const MAX_Y = ROOM_ROWS * ROOM_TILE - MARGIN;

// Interaction spot offsets per furniture type (in pixels from furniture tile origin)
const FURNITURE_OFFSETS: Partial<Record<FurnitureItem['type'], { dx: number; dy: number; label: string }>> = {
  desk:            { dx: 0,  dy: 10, label: 'Typing...' },
  coffee:          { dx: 10, dy: 0,  label: 'Getting coffee' },
  whiteboard:      { dx: 0,  dy: 14, label: 'Brainstorming' },
  plant:           { dx: 6,  dy: 0,  label: 'Brief pause' },
  couch:           { dx: 0,  dy: 6,  label: 'Relaxing' },
  bookshelf:       { dx: 6,  dy: 0,  label: 'Reading' },
  monitor:         { dx: 0,  dy: 10, label: 'Checking metrics' },
  chartBoard:      { dx: 0,  dy: 12, label: 'Analyzing data' },
  serverRack:      { dx: 6,  dy: 0,  label: 'Server check' },
  camera:          { dx: 0,  dy: 10, label: 'Recording' },
  meetingTable:    { dx: 16, dy: 8,  label: 'In meeting' },
  waterCooler:     { dx: 10, dy: 0,  label: 'Water break' },
  printer:         { dx: 0,  dy: 10, label: 'Printing' },
  stickyWall:      { dx: 0,  dy: 14, label: 'Organizing ideas' },
  cabinet:         { dx: 6,  dy: 0,  label: 'Filing documents' },
  projectorScreen: { dx: 0,  dy: 14, label: 'Presenting' },
};

// Bubble types by domain
const DOMAIN_BUBBLES: Record<DomainId, BubbleContent[]> = {
  content: ['thinking', 'eureka', 'chat'],
  sales:   ['money', 'chart', 'eureka'],
  dev:     ['code', 'thinking', 'eureka'],
  design:  ['thinking', 'eureka', 'chat'],
  data:    ['chart', 'thinking', 'code'],
  ops:     ['code', 'chart', 'thinking'],
};

// ── Utilities ──

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Clamp position to stay inside room bounds (top margin accounts for wall) */
function clamp(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(MARGIN, Math.min(MAX_X, x)),
    y: Math.max(MARGIN_TOP, Math.min(MAX_Y, y)),
  };
}

/** Add slight random jitter for natural feeling (±offset px) */
function jitter(val: number, offset: number, seed: number): number {
  return val + ((seed % (offset * 2 + 1)) - offset);
}

/** Build a simple obstacle grid for pathfinding. Each cell = 1 tile. True = blocked */
function buildObstacleGrid(domain: DomainId): boolean[][] {
  const grid: boolean[][] = Array.from({ length: ROOM_ROWS }, () =>
    Array.from({ length: ROOM_COLS }, () => false),
  );
  const furniture = furnitureTemplates[domain];
  // Mark tiles occupied by furniture (rug and lamp are walkable)
  furniture.forEach((f) => {
    if (f.type === 'rug' || f.type === 'lamp') return;
    // Furniture occupies ~1-2 tiles depending on size
    const tileSpanX = f.type === 'meetingTable' || f.type === 'projectorScreen' ? 2 : 1;
    const tileSpanY = f.type === 'bookshelf' || f.type === 'serverRack' || f.type === 'cabinet' ? 2 : 1;
    for (let dy = 0; dy < tileSpanY; dy++) {
      for (let dx = 0; dx < tileSpanX; dx++) {
        const gx = Math.min(ROOM_COLS - 1, f.x + dx);
        const gy = Math.min(ROOM_ROWS - 1, f.y + dy);
        if (gy >= 0 && gy < ROOM_ROWS && gx >= 0 && gx < ROOM_COLS) {
          grid[gy][gx] = true;
        }
      }
    }
  });
  return grid;
}

/** Simple path detour: if straight line crosses obstacles, add intermediate waypoint */
function findDetour(
  fromX: number, fromY: number,
  toX: number, toY: number,
  grid: boolean[][],
): { x: number; y: number } | null {
  // Sample points along the straight path
  const steps = 6;
  let blocked = false;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = Math.floor((fromX + (toX - fromX) * t) / ROOM_TILE);
    const sy = Math.floor((fromY + (toY - fromY) * t) / ROOM_TILE);
    if (sy >= 0 && sy < ROOM_ROWS && sx >= 0 && sx < ROOM_COLS && grid[sy][sx]) {
      blocked = true;
      break;
    }
  }
  if (!blocked) return null;

  // Find a clear detour point: try going around via Y offset then X
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  // Try 4 detour directions
  const offsets = [
    { dx: 0, dy: -ROOM_TILE * 2 },
    { dx: 0, dy: ROOM_TILE * 2 },
    { dx: -ROOM_TILE * 2, dy: 0 },
    { dx: ROOM_TILE * 2, dy: 0 },
  ];
  for (const off of offsets) {
    const cx = midX + off.dx;
    const cy = midY + off.dy;
    const clamped = clamp(cx, cy);
    const gx = Math.floor(clamped.x / ROOM_TILE);
    const gy = Math.floor(clamped.y / ROOM_TILE);
    if (gy >= 0 && gy < ROOM_ROWS && gx >= 0 && gx < ROOM_COLS && !grid[gy][gx]) {
      return clamped;
    }
  }
  // No detour found, just go direct
  return null;
}

// ── Compute home positions ──

function computeHomePositions(
  agents: AgentSummary[],
  roomCols: number,
  roomRows: number,
): Map<string, { x: number; y: number }> {
  const sorted = [...agents].sort((a, b) => a.tier - b.tier);
  const map = new Map<string, { x: number; y: number }>();

  // Chief gets a prominent central-top position
  sorted.forEach((agent, idx) => {
    const isChief = agent.tier === 0;
    if (isChief) {
      map.set(agent.id, clamp(
        (roomCols * ROOM_TILE) / 2 - 20,
        ROOM_TILE * 3.5,
      ));
    } else {
      const nonChiefIdx = idx - (sorted[0]?.tier === 0 ? 1 : 0);
      // Spread agents within the room with generous spacing
      const cols = Math.min(6, Math.ceil(Math.sqrt(agents.length)));
      const col = nonChiefIdx % cols;
      const row = Math.floor(nonChiefIdx / cols);
      const spacing_x = (roomCols * ROOM_TILE - MARGIN * 2) / (cols + 1);
      const startY = ROOM_TILE * 4;
      const spacing_y = ROOM_TILE * 2;
      map.set(agent.id, clamp(
        MARGIN + spacing_x * (col + 1),
        startY + row * spacing_y,
      ));
    }
  });

  return map;
}

// ── Waypoints from furniture ──

function furnitureWaypoints(domain: DomainId): Array<{ x: number; y: number; label: string; type: FurnitureItem['type'] }> {
  const furniture = furnitureTemplates[domain];
  return furniture
    .filter((f) => f.type !== 'rug' && f.type !== 'lamp')
    .map((f) => {
      const offset = FURNITURE_OFFSETS[f.type] || { dx: 0, dy: 0, label: 'Idle' };
      const pos = clamp(
        f.x * ROOM_TILE + offset.dx,
        f.y * ROOM_TILE + offset.dy,
      );
      return { ...pos, label: offset.label, type: f.type };
    });
}

// ── Hook ──

export function useAgentMovement(
  agents: AgentSummary[] | undefined,
  domain: DomainId,
): Map<string, AgentMovementState> {
  const [movementMap, setMovementMap] = useState<Map<string, AgentMovementState>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const stateRef = useRef<Map<string, AgentMovementState>>(new Map());
  const tickRef = useRef(0);

  const homePositions = useMemo(
    () => (agents ? computeHomePositions(agents, ROOM_COLS, ROOM_ROWS) : new Map<string, { x: number; y: number }>()),
    [agents],
  );

  const waypoints = useMemo(() => furnitureWaypoints(domain), [domain]);
  const bubbleOptions = useMemo(() => DOMAIN_BUBBLES[domain], [domain]);
  const obstacleGrid = useMemo(() => buildObstacleGrid(domain), [domain]);

  const pickNextAction = useCallback(
    (agentId: string, isChief: boolean) => {
      const home = homePositions.get(agentId);
      if (!home) return;

      const hash = hashStr(agentId + tickRef.current);
      tickRef.current += 1;

      // Chiefs stay put more often for gravitas
      const stayChance = isChief ? 82 : 60;
      const roll = hash % 100;
      const current = stateRef.current.get(agentId);

      // ── IDLE: Stay or return home with gentle sway ──
      if (roll < stayChance) {
        // Very subtle micro-jitter to feel alive
        const jx = jitter(home.x, 4, hash);
        const jy = jitter(home.y, 3, hash >> 4);
        const { x: cx, y: cy } = clamp(jx, jy);

        const newState: AgentMovementState = {
          x: cx,
          y: cy,
          activity: 'idle',
          facing: current?.facing || 'right',
          activityLabel: 'Working...',
        };
        stateRef.current.set(agentId, newState);
        setMovementMap(new Map(stateRef.current));
        return;
      }

      // ── FURNITURE: Walk to a nearby item ──
      if (roll < stayChance + 22 && waypoints.length > 0) {
        const wp = waypoints[hash % waypoints.length];
        // Natural offset so agents don't stack exactly
        const dest = clamp(
          jitter(wp.x, 8, hash >> 2),
          jitter(wp.y, 8, hash >> 6),
        );
        const fromX = current?.x || home.x;
        const fromY = current?.y || home.y;
        const facing: FacingDirection = dest.x > fromX ? 'right' : 'left';

        // Check for obstacle detour
        const detour = findDetour(fromX, fromY, dest.x, dest.y, obstacleGrid);
        if (detour) {
          // Walk to detour point first
          const detourFacing: FacingDirection = detour.x > fromX ? 'right' : 'left';
          stateRef.current.set(agentId, {
            x: detour.x, y: detour.y,
            activity: 'walking', facing: detourFacing,
            activityLabel: `Going to ${wp.label.toLowerCase()}`,
          });
          setMovementMap(new Map(stateRef.current));
          // Then walk to destination after short delay
          const legTimer = setTimeout(() => {
            stateRef.current.set(agentId, {
              x: dest.x, y: dest.y,
              activity: 'walking', facing,
              activityLabel: `Going to ${wp.label.toLowerCase()}`,
            });
            setMovementMap(new Map(stateRef.current));
          }, 800 + (hash % 400));
          timersRef.current.set(`${agentId}-leg`, legTimer);
        } else {
          // Direct walk
          stateRef.current.set(agentId, {
            x: dest.x, y: dest.y,
            activity: 'walking', facing,
            activityLabel: `Going to ${wp.label.toLowerCase()}`,
          });
          setMovementMap(new Map(stateRef.current));
        }

        // Arrive + show bubble after a natural delay
        const arriveDelay = (detour ? 2000 : 1200) + (hash % 800);
        const arriveTimer = setTimeout(() => {
          stateRef.current.set(agentId, {
            x: dest.x,
            y: dest.y,
            activity: 'at-furniture',
            facing,
            bubble: bubbleOptions[hash % bubbleOptions.length],
            activityLabel: wp.label,
          });
          setMovementMap(new Map(stateRef.current));

          // Clear bubble after lingering
          const clearTimer = setTimeout(() => {
            const st = stateRef.current.get(agentId);
            if (st?.activity === 'at-furniture') {
              stateRef.current.set(agentId, { ...st, bubble: undefined });
              setMovementMap(new Map(stateRef.current));
            }
          }, 3000 + (hash % 2000));
          timersRef.current.set(`${agentId}-bubble`, clearTimer);
        }, arriveDelay);

        timersRef.current.set(`${agentId}-arrive`, arriveTimer);
        return;
      }

      // ── CHAT: Walk to another agent ──
      if (agents && agents.length > 1) {
        const otherAgents = agents.filter((a) => a.id !== agentId);
        const targetAgent = otherAgents[hash % otherAgents.length];
        const targetPos = stateRef.current.get(targetAgent.id) || homePositions.get(targetAgent.id);

        if (targetPos) {
          // Stand beside the target (not on top)
          const side = hash % 2 === 0 ? 36 : -36;
          const dest = clamp(
            targetPos.x + side,
            jitter(targetPos.y, 6, hash >> 3),
          );
          const fromX = current?.x || home.x;
          const fromY = current?.y || home.y;
          const facing: FacingDirection = dest.x > fromX ? 'right' : 'left';

          // Check for obstacle detour
          const detour = findDetour(fromX, fromY, dest.x, dest.y, obstacleGrid);
          if (detour) {
            const detourFacing: FacingDirection = detour.x > fromX ? 'right' : 'left';
            stateRef.current.set(agentId, {
              x: detour.x, y: detour.y,
              activity: 'walking', facing: detourFacing,
              targetAgentId: targetAgent.id,
              activityLabel: `Walking to ${targetAgent.name}`,
            });
            setMovementMap(new Map(stateRef.current));
            const legTimer = setTimeout(() => {
              stateRef.current.set(agentId, {
                x: dest.x, y: dest.y,
                activity: 'walking', facing,
                targetAgentId: targetAgent.id,
                activityLabel: `Walking to ${targetAgent.name}`,
              });
              setMovementMap(new Map(stateRef.current));
            }, 800 + (hash % 400));
            timersRef.current.set(`${agentId}-chatleg`, legTimer);
          } else {
            stateRef.current.set(agentId, {
              x: dest.x, y: dest.y,
              activity: 'walking', facing,
              targetAgentId: targetAgent.id,
              activityLabel: `Walking to ${targetAgent.name}`,
            });
            setMovementMap(new Map(stateRef.current));
          }

          // Chat phase — longer delay for natural approach
          const chatDelay = (detour ? 2200 : 1400) + (hash % 800);
          const chatTimer = setTimeout(() => {
            const bubbleType = bubbleOptions[hash % bubbleOptions.length];
            stateRef.current.set(agentId, {
              x: dest.x,
              y: dest.y,
              activity: 'chatting',
              facing,
              targetAgentId: targetAgent.id,
              bubble: bubbleType,
              activityLabel: `Chatting with ${targetAgent.name}`,
            });

            // Target faces the initiator
            const targetState = stateRef.current.get(targetAgent.id);
            if (targetState) {
              const tFacing: FacingDirection = dest.x < targetPos.x ? 'right' : 'left';
              stateRef.current.set(targetAgent.id, {
                ...targetState,
                activity: 'chatting',
                targetAgentId: agentId,
                facing: tFacing,
                bubble: bubbleOptions[(hash + 1) % bubbleOptions.length],
                activityLabel: `Chatting with ${agents.find((a) => a.id === agentId)?.name || 'agent'}`,
              });
            }
            setMovementMap(new Map(stateRef.current));

            // End chat — longer conversations
            const endTimer = setTimeout(() => {
              const s1 = stateRef.current.get(agentId);
              if (s1?.activity === 'chatting') {
                stateRef.current.set(agentId, {
                  ...s1, activity: 'idle', bubble: undefined,
                  targetAgentId: undefined, activityLabel: 'Working...',
                });
              }
              const s2 = stateRef.current.get(targetAgent.id);
              if (s2?.activity === 'chatting' && s2.targetAgentId === agentId) {
                stateRef.current.set(targetAgent.id, {
                  ...s2, activity: 'idle', bubble: undefined,
                  targetAgentId: undefined, activityLabel: 'Working...',
                });
              }
              setMovementMap(new Map(stateRef.current));
            }, 4000 + (hash % 4000));

            timersRef.current.set(`${agentId}-endchat`, endTimer);
          }, chatDelay);

          timersRef.current.set(`${agentId}-chat`, chatTimer);
          return;
        }
      }

      // Fallback: stay put
      setMovementMap(new Map(stateRef.current));
    },
    [agents, homePositions, waypoints, bubbleOptions],
  );

  // ── Initialize + run movement cycles — slow and organic ──
  useEffect(() => {
    if (!agents || agents.length === 0) return;

    // Initialize all agents at home
    const initialMap = new Map<string, AgentMovementState>();
    agents.forEach((agent) => {
      const home = homePositions.get(agent.id);
      if (home) {
        initialMap.set(agent.id, {
          x: home.x, y: home.y,
          activity: 'idle', facing: 'right', activityLabel: 'Working...',
        });
      }
    });
    stateRef.current = initialMap;
    setMovementMap(new Map(initialMap));

    // Staggered movement cycles — MUCH slower for natural feel
    agents.forEach((agent) => {
      const h = hashStr(agent.name);
      const isChief = agent.tier === 0;
      // Slow base interval: 10-25s, chiefs lean longer
      const baseInterval = isChief ? 14000 : 10000;
      const varianceRange = isChief ? 10000 : 12000;

      // Stagger start: 2-8 seconds initial delay
      const initialDelay = 2000 + (h % 6000);

      const startTimer = setTimeout(() => {
        const tick = () => {
          pickNextAction(agent.id, isChief);
          // Each tick has a different interval for organic rhythm
          const nextInterval = baseInterval + (hashStr(agent.id + Date.now()) % varianceRange);
          const nextTimer = setTimeout(tick, nextInterval);
          timersRef.current.set(`${agent.id}-cycle`, nextTimer);
        };
        tick();
      }, initialDelay);

      timersRef.current.set(`${agent.id}-start`, startTimer);
    });

    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [agents, homePositions, pickNextAction]);

  return movementMap;
}
