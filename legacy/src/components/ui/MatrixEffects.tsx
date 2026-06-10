'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// -- Matrix Digital Rain (Canvas) --

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/{}[];:=+*&^%$#@!';
const FONT_SIZE = 14;
const COLUMN_GAP = FONT_SIZE + 2;

const MatrixRainCanvas = memo(function MatrixRainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let lastTime = 0;
    const FPS_INTERVAL = 1000 / 18; // ~18fps to save CPU

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const columns = Math.floor(canvas.width / COLUMN_GAP);
    const drops: number[] = [];
    const speeds: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -50;
      speeds[i] = 0.3 + Math.random() * 0.7;
    }

    const draw = (timestamp: number) => {
      animFrameId = requestAnimationFrame(draw);
      const elapsed = timestamp - lastTime;
      if (elapsed < FPS_INTERVAL) return;
      lastTime = timestamp - (elapsed % FPS_INTERVAL);

      // Fade trail — slower fade = longer tails
      ctx.fillStyle = 'rgba(2, 8, 2, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < columns; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * COLUMN_GAP;
        const y = drops[i] * FONT_SIZE;

        // Head character — bright white-green
        if (Math.random() > 0.6) {
          ctx.fillStyle = 'rgba(200, 255, 200, 1)';
        } else {
          ctx.fillStyle = `rgba(0, 230, 80, ${0.6 + Math.random() * 0.4})`;
        }
        ctx.fillText(char, x, y);

        // Near-head glow — slightly dimmer
        if (y > FONT_SIZE) {
          const nearChar = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillStyle = `rgba(0, 200, 60, ${0.3 + Math.random() * 0.25})`;
          ctx.fillText(nearChar, x, y - FONT_SIZE);
        }

        // Trail characters — mid brightness
        if (y > FONT_SIZE * 3) {
          const trailChar = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillStyle = `rgba(0, 160, 50, ${0.15 + Math.random() * 0.15})`;
          ctx.fillText(trailChar, x, y - FONT_SIZE * 3);
        }

        drops[i] += speeds[i];

        // Reset when off screen
        if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
          drops[i] = Math.random() * -20;
          speeds[i] = 0.3 + Math.random() * 0.7;
        }
      }
    };

    animFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-[0.18]"
      aria-hidden="true"
    />
  );
});

// -- Boot Sequence Overlay --

const BOOT_LINES = [
  { text: '> AIOS MATRIX MODE v4.4.6', delay: 0 },
  { text: '> Initializing neural interface...', delay: 300 },
  { text: '> Loading agent network [\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588] 100%', delay: 700 },
  { text: '> Establishing encrypted channels...', delay: 1100 },
  { text: '> System ready. Welcome back, operator.', delay: 1500 },
];

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LINES.forEach((line, i) => {
      timers.push(
        setTimeout(() => setVisibleLines(i + 1), line.delay)
      );
    });

    // Fade out after all lines shown
    timers.push(
      setTimeout(onComplete, 2600)
    );

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#010401]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 200, 50, 0.05) 0%, transparent 60%)',
        }}
      />

      <div className="font-mono text-sm max-w-lg px-6 relative">
        {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-2"
            style={{
              color: i === visibleLines - 1 ? '#6eff6e' : '#3a8a4a',
              textShadow: i === visibleLines - 1 ? '0 0 10px rgba(0, 255, 50, 0.5)' : 'none',
            }}
          >
            {line.text}
            {i === visibleLines - 1 && (
              <span className="matrix-terminal-cursor" />
            )}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
}

// -- Main Export --

export function MatrixEffects() {
  const [booted, setBooted] = useState(() => {
    // Only show boot once per session
    if (typeof sessionStorage === 'undefined') return true;
    return sessionStorage.getItem('matrix-booted') === 'true';
  });

  const handleBootComplete = () => {
    sessionStorage.setItem('matrix-booted', 'true');
    setBooted(true);
  };

  return (
    <>
      {/* Digital Rain Background */}
      <MatrixRainCanvas />

      {/* Scanline sweep — pure CSS div */}
      <div className="matrix-scanline-sweep" aria-hidden="true" />

      {/* Boot Sequence */}
      <AnimatePresence>
        {!booted && <BootSequence onComplete={handleBootComplete} />}
      </AnimatePresence>
    </>
  );
}
