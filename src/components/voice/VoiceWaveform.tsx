import { useRef, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceWaveformProps {
  timeDomainData: Uint8Array | null;
  isActive: boolean;
  color?: string;
  thinkingColor?: string;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COLOR = '#D1FF00';
const DEFAULT_THINKING_COLOR = '#0099FF';
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const CANVAS_HEIGHT = 64;
const GLOW_EXTRA_WIDTH = 2;
const GLOW_ALPHA_FACTOR = 0.35;
const LERP_FACTOR = 0.3;
const MIN_BAR_HEIGHT = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a hex color (#RRGGBB) into [r, g, b]. */
function hexToRGB(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** Linear interpolation between two values. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Compute edge-fade multiplier: 1.0 at center, fading toward 0 at the
 * extremes. Uses a cosine curve for a smooth vignette.
 */
function edgeFade(index: number, total: number): number {
  if (total <= 1) return 1;
  // Normalized position 0..1
  const t = index / (total - 1);
  // Cosine-based fade: 1 in center, ~0.25 at edges
  return 0.25 + 0.75 * Math.sin(t * Math.PI);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * VoiceWaveform -- Canvas-based mirrored waveform visualization.
 *
 * Draws vertically-mirrored bars with gradient fills, glow effects, rounded
 * caps, frame interpolation, edge vignette, and a glowing center line.
 * Renders at 60 fps via requestAnimationFrame with DPR-aware sizing.
 */
export function VoiceWaveform({
  timeDomainData,
  isActive,
  color = DEFAULT_COLOR,
  thinkingColor = DEFAULT_THINKING_COLOR,
  state,
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);
  const isActiveRef = useRef(isActive);
  const stateRef = useRef(state);

  // Smoothed amplitude buffer (persists across frames for lerp)
  const smoothedRef = useRef<Float32Array | null>(null);

  // Ref to hold latest draw function (avoids self-reference in useCallback)
  const drawRef = useRef<() => void>(() => {});

  // Keep refs in sync without re-triggering the animation loop
  useEffect(() => {
    dataRef.current = timeDomainData;
    isActiveRef.current = isActive;
    stateRef.current = state;
  });

  // Resolve active color based on state
  const resolveColor = useCallback((): string => {
    if (stateRef.current === 'thinking') return thinkingColor;
    return color;
  }, [color, thinkingColor]);

  // ------------------------------------------------------------------
  // Draw
  // ------------------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const dpr = window.devicePixelRatio || 1;
    const logicalW = width / dpr;
    const logicalH = height / dpr;

    const activeColor = resolveColor();
    const [cR, cG, cB] = hexToRGB(activeColor);
    const data = dataRef.current;
    const active = isActiveRef.current;
    const centerY = logicalH / 2;

    // ---- Center line (always visible) --------------------------------

    const drawCenterLine = (alpha: number) => {
      const grad = ctx.createLinearGradient(0, centerY, logicalW, centerY);
      grad.addColorStop(0, `rgba(${cR},${cG},${cB},0)`);
      grad.addColorStop(0.15, `rgba(${cR},${cG},${cB},${alpha})`);
      grad.addColorStop(0.5, `rgba(${cR},${cG},${cB},${alpha})`);
      grad.addColorStop(0.85, `rgba(${cR},${cG},${cB},${alpha})`);
      grad.addColorStop(1, `rgba(${cR},${cG},${cB},0)`);

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.moveTo(0, centerY);
      ctx.lineTo(logicalW, centerY);
      ctx.stroke();

      // Subtle glow pass for the center line
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${cR},${cG},${cB},${alpha * 0.3})`;
      ctx.lineWidth = 3;
      ctx.moveTo(0, centerY);
      ctx.lineTo(logicalW, centerY);
      ctx.stroke();
    };

    if (!active || !data || data.length === 0) {
      drawCenterLine(0.25);
      rafRef.current = requestAnimationFrame(() => drawRef.current());
      return;
    }

    // ---- Compute bar layout ------------------------------------------

    const totalBarWidth = BAR_WIDTH + BAR_GAP;
    const barCount = Math.floor(logicalW / totalBarWidth);
    if (barCount === 0) {
      rafRef.current = requestAnimationFrame(() => drawRef.current());
      return;
    }

    const step = Math.max(1, Math.floor(data.length / barCount));

    // ---- Build raw amplitude array & interpolate ---------------------

    // Ensure smoothed buffer exists and has correct size
    if (!smoothedRef.current || smoothedRef.current.length !== barCount) {
      smoothedRef.current = new Float32Array(barCount);
    }
    const smoothed = smoothedRef.current;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.min(i * step, data.length - 1);
      const sample = data[dataIndex];
      const normalized = (sample - 128) / 128; // -1..1
      const rawAmplitude = Math.abs(normalized);

      // Lerp toward the new value for smooth transitions
      smoothed[i] = lerp(smoothed[i], rawAmplitude, LERP_FACTOR);
    }

    // ---- Draw center line behind bars --------------------------------

    drawCenterLine(0.12);

    // ---- Draw bars (two passes: glow then crisp) ---------------------

    const drawBars = (extraWidth: number, alphaMultiplier: number) => {
      for (let i = 0; i < barCount; i++) {
        const amplitude = smoothed[i];
        const halfBar = Math.max(MIN_BAR_HEIGHT / 2, (amplitude * logicalH * 0.45));
        const x = i * totalBarWidth;
        const barW = BAR_WIDTH + extraWidth;

        // Edge vignette factor
        const fade = edgeFade(i, barCount);
        const baseAlpha = fade * alphaMultiplier * (0.4 + amplitude * 0.6);

        // --- Upper half (center -> top) ---
        const gradUp = ctx.createLinearGradient(x, centerY, x, centerY - halfBar);
        gradUp.addColorStop(0, `rgba(${cR},${cG},${cB},${baseAlpha})`);
        gradUp.addColorStop(1, `rgba(${cR},${cG},${cB},0)`);

        // --- Lower half (center -> bottom) ---
        const gradDown = ctx.createLinearGradient(x, centerY, x, centerY + halfBar);
        gradDown.addColorStop(0, `rgba(${cR},${cG},${cB},${baseAlpha})`);
        gradDown.addColorStop(1, `rgba(${cR},${cG},${cB},0)`);

        const radius = Math.min(barW / 2, 1.5);

        // Upper bar
        ctx.beginPath();
        ctx.fillStyle = gradUp;
        ctx.roundRect(
          x - extraWidth / 2,
          centerY - halfBar,
          barW,
          halfBar,
          [radius, radius, 0, 0],
        );
        ctx.fill();

        // Lower bar (mirrored)
        ctx.beginPath();
        ctx.fillStyle = gradDown;
        ctx.roundRect(
          x - extraWidth / 2,
          centerY,
          barW,
          halfBar,
          [0, 0, radius, radius],
        );
        ctx.fill();

        // Rounded caps at the tips (small circles for polish)
        if (halfBar > MIN_BAR_HEIGHT && amplitude > 0.05) {
          const capRadius = Math.min(barW / 2, 1.5);
          const capAlpha = baseAlpha * 0.8;
          ctx.fillStyle = `rgba(${cR},${cG},${cB},${capAlpha})`;

          // Top cap
          ctx.beginPath();
          ctx.arc(x + BAR_WIDTH / 2, centerY - halfBar, capRadius, 0, Math.PI * 2);
          ctx.fill();

          // Bottom cap
          ctx.beginPath();
          ctx.arc(x + BAR_WIDTH / 2, centerY + halfBar, capRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Pass 1: Glow (wider, lower alpha)
    drawBars(GLOW_EXTRA_WIDTH, GLOW_ALPHA_FACTOR);

    // Pass 2: Crisp bars
    drawBars(0, 1);

    // ---- Schedule next frame -----------------------------------------

    rafRef.current = requestAnimationFrame(() => drawRef.current());
  }, [resolveColor]);

  // Keep drawRef in sync
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // ------------------------------------------------------------------
  // Animation loop lifecycle
  // ------------------------------------------------------------------

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => drawRef.current());
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draw]);

  // ------------------------------------------------------------------
  // Responsive canvas sizing (DPR-aware)
  // ------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });

    resizeObserver.observe(canvas);
    // Initial sizing
    resize();

    return () => resizeObserver.disconnect();
  }, []);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: CANVAS_HEIGHT }}
      aria-hidden="true"
    />
  );
}

export default VoiceWaveform;
