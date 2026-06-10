'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { DomainId } from './world-layout';
import { domains } from './world-layout';

interface AmbientParticlesProps {
  domain: DomainId;
  roomWidth: number;
  roomHeight: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
  opacity: number;
  char?: string;
}

// Domain-specific particle characters
const DOMAIN_CHARS: Record<DomainId, string[]> = {
  content: ['✦', '♦', '◇'],
  sales:   ['$', '◆', '▲'],
  dev:     ['<', '/', '>'],
  design:  ['●', '◐', '★'],
  data:    ['0', '1', '⬡'],
  ops:     ['⚙', '◎', '⬢'],
};

const PARTICLE_COUNT = 12;

function hashNum(seed: number): number {
  let h = seed;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  return Math.abs(h);
}

export function AmbientParticles({ domain, roomWidth, roomHeight }: AmbientParticlesProps) {
  const d = domains[domain];
  const chars = DOMAIN_CHARS[domain];

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const h = hashNum(i * 7919 + domain.charCodeAt(0));
      return {
        id: i,
        x: (h % roomWidth),
        y: ((h >> 8) % roomHeight),
        size: 6 + (h % 8),
        delay: (h % 5000) / 1000,
        duration: 8 + (h % 12),
        driftX: ((h >> 4) % 60) - 30,
        driftY: -20 - ((h >> 6) % 40),
        opacity: 0.08 + ((h % 10) / 100),
        char: chars[h % chars.length],
      };
    });
  }, [domain, roomWidth, roomHeight, chars]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute select-none font-mono"
          style={{
            left: p.x,
            top: p.y,
            fontSize: p.size,
            color: d.tileColor,
          }}
          animate={{
            x: [0, p.driftX, 0],
            y: [0, p.driftY, 0],
            opacity: [0, p.opacity, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        >
          {p.char}
        </motion.div>
      ))}
    </div>
  );
}
