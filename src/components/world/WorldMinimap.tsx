import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { rooms, TILE_WIDTH, TILE_HEIGHT } from './world-layout';
import { useDomains } from './DomainContext';
import { useAgentActivityStore } from '../../stores/agentActivityStore';

interface WorldMinimapProps {
  currentRoomId: string | null;
  onRoomClick: (roomId: string) => void;
}

const MINI_SCALE = 0.12;
const MINI_DOT = 10;

export function WorldMinimap({ currentRoomId, onRoomClick }: WorldMinimapProps) {
  const domains = useDomains();
  const activities = useAgentActivityStore((s) => s.activities);

  const hasActiveAgents = useMemo(() => {
    let count = 0;
    activities.forEach((a) => { if (a.isActive) count++; });
    return count > 0;
  }, [activities]);

  const maxCol = Math.max(...rooms.map((r) => r.gridX));
  const maxRow = Math.max(...rooms.map((r) => r.gridY));
  const mapW = (maxCol + maxRow + 3) * (TILE_WIDTH * MINI_SCALE);
  const mapH = (maxCol + maxRow + 3) * (TILE_HEIGHT * MINI_SCALE) + 10;

  return (
    <div
      className="glass-panel rounded-xl border border-glass-border overflow-hidden"
      style={{ width: mapW + 16 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1"
        style={{ borderBottom: '1px solid var(--glass-border-color, rgba(255,255,255,0.06))' }}
      >
        <span className="text-[8px] text-tertiary font-bold uppercase tracking-widest">World Map</span>
        {hasActiveAgents && (
          <div className="flex items-center gap-1">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#10B981' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="text-[7px] font-bold" style={{ color: '#10B981' }}>LIVE</span>
          </div>
        )}
      </div>

      <div className="p-2">
        <div className="relative" style={{ width: mapW, height: mapH }}>
          {rooms.map((room) => {
            const d = domains[room.domain];
            const px = (room.gridX - room.gridY) * (TILE_WIDTH * MINI_SCALE / 2) + mapW / 2 - MINI_DOT / 2;
            const py = (room.gridX + room.gridY) * (TILE_HEIGHT * MINI_SCALE / 2);
            const isCurrent = currentRoomId === room.squadId;

            return (
              <motion.div
                key={room.squadId}
                className="absolute rounded-sm cursor-pointer group"
                style={{
                  left: px,
                  top: py,
                  width: MINI_DOT,
                  height: MINI_DOT / 2,
                  backgroundColor: d.tileColor,
                  opacity: isCurrent ? 1 : 0.45,
                  boxShadow: isCurrent ? `0 0 8px ${d.tileColor}60` : 'none',
                }}
                whileHover={{ scale: 1.8, opacity: 1 }}
                onClick={() => onRoomClick(room.squadId)}
              >
                {/* Current room indicator */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-[-3px] rounded"
                    style={{ border: `1.5px solid ${d.tileColor}` }}
                    animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {/* Tooltip */}
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded text-[7px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                  style={{ background: d.tileColor }}
                >
                  {room.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
