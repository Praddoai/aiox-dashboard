'use client';

import { motion } from 'framer-motion';
import { rooms, domains, TILE_WIDTH, TILE_HEIGHT } from './world-layout';

interface WorldMinimapProps {
  currentRoomId: string | null;
  onRoomClick: (roomId: string) => void;
}

const MINI_SCALE = 0.12;
const MINI_DOT = 8;

export function WorldMinimap({ currentRoomId, onRoomClick }: WorldMinimapProps) {
  const maxCol = Math.max(...rooms.map((r) => r.gridX));
  const maxRow = Math.max(...rooms.map((r) => r.gridY));
  const mapW = (maxCol + maxRow + 3) * (TILE_WIDTH * MINI_SCALE);
  const mapH = (maxCol + maxRow + 3) * (TILE_HEIGHT * MINI_SCALE) + 10;

  return (
    <div
      className="glass-panel rounded-xl border border-glass-border p-2"
      style={{ width: mapW + 16, height: mapH + 16 }}
    >
      <div className="relative" style={{ width: mapW, height: mapH }}>
        {rooms.map((room) => {
          const d = domains[room.domain];
          const px = (room.gridX - room.gridY) * (TILE_WIDTH * MINI_SCALE / 2) + mapW / 2 - MINI_DOT / 2;
          const py = (room.gridX + room.gridY) * (TILE_HEIGHT * MINI_SCALE / 2);
          const isCurrent = currentRoomId === room.squadId;

          return (
            <motion.div
              key={room.squadId}
              className="absolute rounded-sm cursor-pointer"
              style={{
                left: px,
                top: py,
                width: MINI_DOT,
                height: MINI_DOT / 2,
                backgroundColor: d.tileColor,
                opacity: isCurrent ? 1 : 0.5,
              }}
              whileHover={{ scale: 1.5, opacity: 1 }}
              onClick={() => onRoomClick(room.squadId)}
            >
              {isCurrent && (
                <motion.div
                  className="absolute inset-[-2px] rounded-sm"
                  style={{ border: `1px solid ${d.tileColor}` }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
