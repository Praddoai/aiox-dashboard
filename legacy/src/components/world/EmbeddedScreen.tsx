'use client';

import { motion } from 'framer-motion';
import type { DomainId } from './world-layout';
import { domains } from './world-layout';

interface EmbeddedScreenProps {
  domain: DomainId;
  type: 'monitor' | 'projectorScreen';
  x: number;
  y: number;
  tileSize: number;
}

const SCREEN_SIZES = {
  monitor: { w: 32, h: 20, offsetX: 5, offsetY: 6 },
  projectorScreen: { w: 48, h: 28, offsetX: 6, offsetY: 8 },
};

export function EmbeddedScreen({ domain, type, x, y, tileSize }: EmbeddedScreenProps) {
  const cfg = SCREEN_SIZES[type];
  const d = domains[domain];

  return (
    <div
      className="absolute pointer-events-none overflow-hidden rounded-sm"
      style={{
        left: x * tileSize + cfg.offsetX,
        top: y * tileSize + cfg.offsetY,
        width: cfg.w,
        height: cfg.h,
        zIndex: y + 2,
      }}
    >
      <svg width={cfg.w} height={cfg.h} viewBox={`0 0 ${cfg.w} ${cfg.h}`}>
        {/* Screen background */}
        <rect width={cfg.w} height={cfg.h} fill="#0a0a0a" rx="1" />

        {/* Domain-specific content */}
        {domain === 'dev' && <DevScreenContent w={cfg.w} h={cfg.h} color={d.tileColor} />}
        {domain === 'data' && <DataScreenContent w={cfg.w} h={cfg.h} color={d.tileColor} />}
        {domain === 'content' && <ContentScreenContent w={cfg.w} h={cfg.h} color={d.tileColor} />}
        {domain === 'sales' && <SalesScreenContent w={cfg.w} h={cfg.h} color={d.tileColor} />}
        {domain === 'design' && <DesignScreenContent w={cfg.w} h={cfg.h} color={d.tileColor} />}
        {domain === 'ops' && <OpsScreenContent w={cfg.w} h={cfg.h} color={d.tileColor} />}

        {/* Screen glare */}
        <rect width={cfg.w} height={cfg.h} fill="url(#screenGlare)" rx="1" />
        <defs>
          <linearGradient id="screenGlare" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.06" />
            <stop offset="50%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0.03" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/** Dev: scrolling code lines */
function DevScreenContent({ w, h, color }: { w: number; h: number; color: string }) {
  const lineWidths = [18, 12, 22, 8, 16, 20, 14, 10, 24, 6];
  return (
    <g>
      <motion.g
        animate={{ y: [0, -30] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        {lineWidths.map((lw, i) => (
          <rect
            key={i}
            x={3}
            y={i * 4 + 2}
            width={Math.min(lw, w - 6)}
            height={2}
            fill={i % 3 === 0 ? color : i % 3 === 1 ? '#6C5CE7' : '#636E72'}
            opacity={0.7}
            rx="0.5"
          />
        ))}
        {/* Second set for seamless loop */}
        {lineWidths.map((lw, i) => (
          <rect
            key={`b-${i}`}
            x={3}
            y={(i + lineWidths.length) * 4 + 2}
            width={Math.min(lw, w - 6)}
            height={2}
            fill={i % 3 === 0 ? color : i % 3 === 1 ? '#6C5CE7' : '#636E72'}
            opacity={0.7}
            rx="0.5"
          />
        ))}
      </motion.g>
      {/* Line numbers */}
      <rect x={0} y={0} width={2} height={h} fill={color} opacity={0.15} />
    </g>
  );
}

/** Data: animated bar chart */
function DataScreenContent({ w, h, color }: { w: number; h: number; color: string }) {
  const bars = 6;
  const barW = Math.floor((w - 8) / bars) - 1;

  return (
    <g>
      {/* Chart baseline */}
      <line x1={2} y1={h - 3} x2={w - 2} y2={h - 3} stroke="#333" strokeWidth="0.5" />
      {/* Bars */}
      {Array.from({ length: bars }).map((_, i) => {
        const maxH = h - 6;
        const barH = (maxH * (0.3 + Math.sin(i * 1.2) * 0.35 + 0.35));
        return (
          <motion.rect
            key={i}
            x={3 + i * (barW + 1)}
            width={barW}
            rx="0.5"
            fill={i % 2 === 0 ? color : `${color}88`}
            opacity={0.8}
            animate={{
              y: [h - 3 - barH, h - 3 - barH * 0.7, h - 3 - barH],
              height: [barH, barH * 0.7, barH],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          />
        );
      })}
    </g>
  );
}

/** Content: video play icon */
function ContentScreenContent({ w, h, color }: { w: number; h: number; color: string }) {
  const cx = w / 2;
  const cy = h / 2;
  return (
    <g>
      {/* Thumbnail background lines */}
      <rect x={2} y={2} width={w - 4} height={h - 4} fill="#1a1a1a" rx="1" />
      {/* Play button circle */}
      <motion.circle
        cx={cx} cy={cy} r={6}
        fill={color}
        opacity={0.8}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {/* Play triangle */}
      <polygon
        points={`${cx - 2},${cy - 3} ${cx - 2},${cy + 3} ${cx + 3},${cy}`}
        fill="white"
        opacity={0.9}
      />
      {/* Progress bar */}
      <rect x={3} y={h - 4} width={w - 6} height={1.5} fill="#333" rx="0.5" />
      <motion.rect
        x={3} y={h - 4}
        height={1.5}
        fill={color}
        rx="0.5"
        animate={{ width: [0, w - 6] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
    </g>
  );
}

/** Sales: dashboard numbers */
function SalesScreenContent({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <g>
      {/* Top metric card */}
      <rect x={2} y={2} width={w / 2 - 3} height={h / 2 - 2} fill="#1a1a1a" rx="1" />
      <rect x={w / 2 + 1} y={2} width={w / 2 - 3} height={h / 2 - 2} fill="#1a1a1a" rx="1" />
      {/* Up arrow indicator */}
      <polygon points={`${w / 4},${4} ${w / 4 - 2},${7} ${w / 4 + 2},${7}`} fill="#2ED573" />
      <rect x={w / 4 - 4} y={8} width={8} height={1.5} fill={color} opacity={0.5} rx="0.5" />
      {/* Dollar sign */}
      <motion.text
        x={w * 3 / 4}
        y={9}
        fill={color}
        fontSize="5"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        $
      </motion.text>
      {/* Bottom sparkline */}
      <polyline
        points={Array.from({ length: 8 }, (_, i) =>
          `${3 + i * ((w - 6) / 7)},${h - 4 - Math.sin(i * 0.8) * 4 - 2}`
        ).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity={0.6}
      />
    </g>
  );
}

/** Design: color palette */
function DesignScreenContent({ w, h, color }: { w: number; h: number; color: string }) {
  const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6', color];
  const swatchW = Math.floor((w - 6) / colors.length);
  return (
    <g>
      {/* Canvas area */}
      <rect x={2} y={2} width={w - 4} height={h - 10} fill="#1e1e1e" rx="1" />
      {/* Abstract shape on canvas */}
      <motion.circle
        cx={w / 2} cy={h / 2 - 3} r={5}
        fill={color}
        opacity={0.6}
        animate={{ r: [4, 6, 4] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <rect x={w / 3} y={h / 3} width={8} height={5} fill="#FFD93D" opacity={0.4} rx="1" />
      {/* Color palette bar at bottom */}
      {colors.map((c, i) => (
        <rect
          key={i}
          x={3 + i * swatchW}
          y={h - 6}
          width={swatchW - 1}
          height={4}
          fill={c}
          rx="0.5"
        />
      ))}
    </g>
  );
}

/** Ops: terminal output */
function OpsScreenContent({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <g>
      {/* Terminal header */}
      <rect x={0} y={0} width={w} height={5} fill="#2a2a2a" />
      <circle cx={3} cy={2.5} r={1} fill="#FF5F56" />
      <circle cx={6} cy={2.5} r={1} fill="#FFBD2E" />
      <circle cx={9} cy={2.5} r={1} fill="#27CA40" />
      {/* Terminal lines */}
      <motion.g
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <rect x={2} y={7} width={4} height={1.5} fill={color} opacity={0.8} />
        <rect x={7} y={7} width={14} height={1.5} fill="#636E72" opacity={0.6} />
        <rect x={2} y={10} width={6} height={1.5} fill="#2ED573" opacity={0.6} />
        <rect x={9} y={10} width={10} height={1.5} fill="#636E72" opacity={0.5} />
        <rect x={2} y={13} width={3} height={1.5} fill={color} opacity={0.8} />
        <rect x={6} y={13} width={18} height={1.5} fill="#636E72" opacity={0.5} />
      </motion.g>
      {/* Blinking cursor */}
      <motion.rect
        x={2} y={h - 5}
        width={3} height={1.5}
        fill={color}
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </g>
  );
}
