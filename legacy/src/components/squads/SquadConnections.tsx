'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SquadConnection } from '@/types';

interface SquadConnectionsProps {
  connections: SquadConnection[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface Point {
  x: number;
  y: number;
}

interface PathData {
  d: string;
  type: 'required' | 'optional';
  key: string;
  label?: string;
}

function getCardCenter(card: Element, container: Element): Point {
  const cardRect = card.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: cardRect.left - containerRect.left + cardRect.width / 2,
    y: cardRect.top - containerRect.top + cardRect.height / 2,
  };
}

function computePaths(
  connections: SquadConnection[],
  container: HTMLDivElement | null
): PathData[] {
  if (!container || connections.length === 0) return [];

  const result: PathData[] = [];

  for (const conn of connections) {
    const fromCard = container.querySelector(`[data-squad="${conn.from}"]`);
    const toCard = container.querySelector(`[data-squad="${conn.to}"]`);
    if (!fromCard || !toCard) continue;

    const from = getCardCenter(fromCard, container);
    const to = getCardCenter(toCard, container);

    // Bezier curve
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx = Math.abs(dx) * 0.35;
    const cy = Math.abs(dy) * 0.15;

    const d = `M ${from.x} ${from.y} C ${from.x + cx} ${from.y + cy}, ${to.x - cx} ${to.y - cy}, ${to.x} ${to.y}`;

    result.push({
      d,
      type: conn.type,
      key: `${conn.from}-${conn.to}`,
      label: conn.reason,
    });
  }

  return result;
}

export function SquadConnections({ connections, containerRef }: SquadConnectionsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<PathData[]>([]);

  const recalculate = useCallback(() => {
    const newPaths = computePaths(connections, containerRef.current);
    setPaths(newPaths);
  }, [connections, containerRef]);

  useEffect(() => {
    // Wait for cards to be rendered before calculating paths
    const timers = [
      setTimeout(recalculate, 100),
      setTimeout(recalculate, 500),
      setTimeout(recalculate, 1500),
    ];

    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container) {
      observer = new ResizeObserver(() => recalculate());
      observer.observe(container);
    }

    const handleResize = () => recalculate();
    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [connections.length, recalculate]);

  if (paths.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-5"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="var(--accent-gold)"
            fillOpacity="0.6"
          />
        </marker>
      </defs>
      {paths.map((p) => (
        <g key={p.key}>
          <path
            d={p.d}
            fill="none"
            stroke="var(--accent-gold)"
            strokeWidth={2}
            strokeOpacity={0.5}
            strokeDasharray={p.type === 'optional' ? '8 5' : 'none'}
            markerEnd="url(#arrowhead)"
          />
        </g>
      ))}
    </svg>
  );
}
