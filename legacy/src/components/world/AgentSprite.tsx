'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { agentSpriteRects, getAgentIdentity, domainSpriteColors, statusColors, tierBadge } from './pixel-sprites';
import type { DomainId } from './world-layout';
import type { AgentTier } from '@/types';
import type { AgentActivity, FacingDirection } from './useAgentMovement';

interface AgentSpriteProps {
  name: string;
  domain: DomainId;
  tier: AgentTier;
  status?: 'online' | 'busy' | 'offline';
  x: number;
  y: number;
  selected?: boolean;
  isChief?: boolean;
  onClick?: () => void;
  onContextMenu?: (x: number, y: number) => void;
  facing?: FacingDirection;
  activity?: AgentActivity;
  activityLabel?: string;
}

const SPRITE_SCALE = 2.5;
const SPRITE_W = 16 * SPRITE_SCALE;
const SPRITE_H = 16 * SPRITE_SCALE;

export function AgentSprite({
  name,
  domain,
  tier,
  status = 'online',
  x,
  y,
  selected,
  isChief,
  onClick,
  onContextMenu,
  facing = 'right',
  activity = 'idle',
  activityLabel,
}: AgentSpriteProps) {
  const colors = domainSpriteColors[domain];
  const identity = useMemo(() => getAgentIdentity(name), [name]);
  const rects = useMemo(() => agentSpriteRects(colors, identity), [colors, identity]);
  const badge = tierBadge[tier];
  const statusColor = statusColors[status];
  const [hovered, setHovered] = useState(false);

  const isWalking = activity === 'walking';
  const flipX = facing === 'left';

  return (
    <motion.div
      className="absolute flex flex-col items-center cursor-pointer"
      style={{
        // Z-ordering: agents sort by Y position, selected always on top
        zIndex: selected ? 50 : Math.floor(y / 56) + 2,
      }}
      animate={{
        left: x,
        top: y,
      }}
      transition={{
        type: 'spring',
        damping: 30,
        stiffness: 60,
        mass: 1.5,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(x, y);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Selection ring */}
      {selected && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: SPRITE_W + 12,
            height: SPRITE_H + 12,
            top: -6,
            left: -6,
            border: `2px solid ${colors.head}`,
            opacity: 0.6,
          }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Tier badge (above head for chiefs) */}
      {isChief && (
        <span
          className="text-[10px] mb-[-2px]"
          style={{ color: badge.color }}
        >
          {badge.symbol}
        </span>
      )}

      {/* Pixel art character with facing direction + walk bob */}
      <motion.svg
        width={SPRITE_W}
        height={SPRITE_H}
        viewBox="0 0 16 16"
        className="[image-rendering:pixelated]"
        style={{
          transform: flipX ? 'scaleX(-1)' : undefined,
        }}
        animate={isWalking ? { y: [0, -2, 0] } : { y: 0 }}
        transition={
          isWalking
            ? { duration: 0.3, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
      >
        {rects.map((r, i) => (
          <rect
            key={i}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={r.fill}
            opacity={r.opacity}
            rx={r.rx}
          />
        ))}
      </motion.svg>

      {/* Status dot */}
      <div
        className="absolute rounded-full"
        style={{
          width: 7,
          height: 7,
          bottom: 14,
          right: -2,
          backgroundColor: statusColor,
          border: '1.5px solid rgba(0,0,0,0.3)',
          boxShadow: `0 0 4px ${statusColor}88`,
        }}
      />

      {/* Busy typing animation */}
      {status === 'busy' && (
        <motion.div
          className="absolute"
          style={{ top: -8, right: -4 }}
        >
          <svg width="16" height="10" viewBox="0 0 16 10">
            <rect x="0" y="2" width="16" height="8" fill="white" opacity="0.9" rx="4" />
            <motion.circle cx="4" cy="6" r="1.5" fill="#636E72"
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.circle cx="8" cy="6" r="1.5" fill="#636E72"
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            />
            <motion.circle cx="12" cy="6" r="1.5" fill="#636E72"
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
            />
          </svg>
        </motion.div>
      )}

      {/* Name label — dark pill bg for contrast on any floor */}
      <span
        className={cn(
          'mt-1 px-1.5 py-0.5 rounded text-center leading-none whitespace-nowrap text-[8px] font-mono max-w-[80px] overflow-hidden text-ellipsis',
          selected && 'font-semibold',
        )}
        style={{
          backgroundColor: selected ? colors.head + 'CC' : 'rgba(0,0,0,0.55)',
          color: selected ? '#fff' : 'rgba(255,255,255,0.9)',
          border: selected ? `1px solid ${colors.head}` : 'none',
        }}
      >
        {name}
      </span>

      {/* Hover tooltip with agent info + activity */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute pointer-events-none z-[40]"
            style={{
              bottom: SPRITE_H + 24,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="rounded-lg px-2 py-1.5 whitespace-nowrap"
              style={{
                backgroundColor: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] text-[var(--color-text-inverse)] font-semibold">{name}</span>
                <span
                  className="px-1 rounded text-[7px] font-bold"
                  style={{
                    backgroundColor: badge.color + '33',
                    color: badge.color,
                  }}
                >
                  {badge.symbol} T{tier}
                </span>
              </div>
              {activityLabel && (
                <div className="text-[8px] text-foreground-secondary font-mono">
                  {activityLabel}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
