import { useMemo, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { agentSpriteRects, getAgentIdentity, domainSpriteColors, statusColors, tierBadge } from './pixel-sprites';
import type { DomainId } from './world-layout';
import type { AgentTier } from '../../types';
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
  liveActive?: boolean;
}

const SPRITE_SCALE = 2.5;
const SPRITE_W = 16 * SPRITE_SCALE;
const SPRITE_H = 16 * SPRITE_SCALE;

export const AgentSprite = memo(function AgentSprite({
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
  liveActive = false,
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
      role="button"
      aria-label={`Agent ${name}, ${status}`}
      tabIndex={0}
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
      {/* Live activity glow — pulsing ring when agent is doing real work */}
      {liveActive && !selected && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: SPRITE_W + 16,
            height: SPRITE_H + 16,
            top: -8,
            left: -8,
            background: `radial-gradient(circle, ${colors.head}33 0%, transparent 70%)`,
          }}
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

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

      {/* Pixel art character with facing direction + walk bob + idle breathing */}
      <motion.svg
        width={SPRITE_W}
        height={SPRITE_H}
        viewBox="0 0 16 16"
        style={{
          imageRendering: 'pixelated',
          transform: flipX ? 'scaleX(-1)' : undefined,
        }}
        animate={
          isWalking
            ? { y: [0, -2, 0] }
            : { y: [0, -0.8, 0], scale: [1, 1.01, 1] }
        }
        transition={
          isWalking
            ? { duration: 0.3, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 2.5 + (identity.bodyHue % 3) * 0.4, repeat: Infinity, ease: 'easeInOut' }
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

      {/* Status dot — reflects live activity */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 7,
          height: 7,
          bottom: 14,
          right: -2,
          backgroundColor: liveActive ? '#10B981' : statusColor,
          border: '1.5px solid rgba(0,0,0,0.3)',
          boxShadow: liveActive ? '0 0 6px #10B98188' : `0 0 4px ${statusColor}88`,
        }}
        animate={liveActive ? { scale: [1, 1.3, 1] } : {}}
        transition={liveActive ? { duration: 1, repeat: Infinity } : {}}
      />

      {/* Busy typing animation */}
      {status === 'busy' && (
        <motion.div
          className="absolute"
          style={{ top: -8, right: -4 }}
        >
          <svg width="16" height="10" viewBox="0 0 16 10">
            <rect x="0" y="2" width="16" height="8" fill="white" opacity="0.9" rx="4" />
            <motion.circle cx="4" cy="6" r="1.5" fill="var(--color-text-tertiary, #636E72)"
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.circle cx="8" cy="6" r="1.5" fill="var(--color-text-tertiary, #636E72)"
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            />
            <motion.circle cx="12" cy="6" r="1.5" fill="var(--color-text-tertiary, #636E72)"
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
            />
          </svg>
        </motion.div>
      )}

      {/* Name label — dark pill bg for contrast on any floor */}
      <span
        className={cn(
          'mt-1 px-1.5 py-0.5 rounded text-center leading-none whitespace-nowrap',
          selected && 'font-semibold',
        )}
        style={{
          fontSize: '8px',
          fontFamily: 'monospace',
          maxWidth: 80,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
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
            className="absolute pointer-events-none"
            style={{
              bottom: SPRITE_H + 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 40,
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
                <span style={{ fontSize: '9px', color: 'var(--color-text-inverse)', fontWeight: 600 }}>{name}</span>
                <span
                  className="px-1 rounded"
                  style={{
                    fontSize: '7px',
                    backgroundColor: badge.color + '33',
                    color: badge.color,
                    fontWeight: 700,
                  }}
                >
                  {badge.symbol} T{tier}
                </span>
              </div>
              {activityLabel && (
                <div style={{ fontSize: '8px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                  {activityLabel}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
