import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  velocity: number;
  rotation: number;
}

const COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#D1FF00', // neon lime (AIOX)
];

function createParticles(count: number, originX: number, originY: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: originX,
    y: originY,
    color: COLORS[i % COLORS.length],
    size: 4 + Math.random() * 6,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
    velocity: 80 + Math.random() * 120,
    rotation: Math.random() * 360,
  }));
}

interface CelebrationProps {
  trigger: boolean;
  originX?: number;
  originY?: number;
  particleCount?: number;
  onComplete?: () => void;
}

export function Celebration({
  trigger,
  originX = window.innerWidth / 2,
  originY = window.innerHeight / 2,
  particleCount = 24,
  onComplete,
}: CelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger && !active) {
      setActive(true);
      setParticles(createParticles(particleCount, originX, originY));

      const timer = setTimeout(() => {
        setActive(false);
        setParticles([]);
        onComplete?.();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 pointer-events-none z-[100]">
          {particles.map((p) => {
            const endX = p.x + Math.cos(p.angle) * p.velocity;
            const endY = p.y + Math.sin(p.angle) * p.velocity - 40;
            const isSquare = p.id % 3 === 0;

            return (
              <motion.div
                key={p.id}
                className={isSquare ? 'absolute' : 'absolute rounded-full'}
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  left: p.x,
                  top: p.y,
                }}
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  x: endX - p.x,
                  y: [0, endY - p.y - 60, endY - p.y + 200],
                  opacity: [1, 1, 0],
                  scale: [0, 1.2, 0.6],
                  rotate: p.rotation + 360,
                }}
                transition={{
                  duration: 1.0 + Math.random() * 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

// Hook for easy celebration triggering
// eslint-disable-next-line react-refresh/only-export-components
export function useCelebration() {
  const [celebrating, setCelebrating] = useState(false);

  const celebrate = useCallback(() => {
    setCelebrating(true);
  }, []);

  const onComplete = useCallback(() => {
    setCelebrating(false);
  }, []);

  return { celebrating, celebrate, onComplete };
}
