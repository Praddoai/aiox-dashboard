import { useMemo, useRef, useEffect, useState } from 'react';
import type { VoiceState } from '../../stores/voiceStore';

interface VoiceOrbProps {
  state: VoiceState;
  inputLevel: number;
  outputLevel: number;
}

const LIME = '#D1FF00';
const BLUE = '#0099FF';
const BG = '#050505';

const PARTICLE_COUNT = 14;

/* Pre-computed burst distances (avoids Math.random in render) */
const BURST_DISTANCES = [93, 112, 85, 107, 98, 116, 88, 104, 95, 110];

/* ---------- helper: generate particle initial angles ---------- */
function buildParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i,
    size: 2 + Math.random() * 2,
    orbitRadius: 146 + Math.random() * 8, // slightly varied orbit
    speed: 0.8 + Math.random() * 0.4, // individual speed factor
  }));
}

const particles = buildParticles(PARTICLE_COUNT);

/* ---------- helper: ring configs ---------- */
const ringConfigs = [
  { inset: 2, dashArray: '4 12', baseOpacity: 0.35, speedDeg: 20, direction: 1 },
  { inset: 18, dashArray: '8 18', baseOpacity: 0.2, speedDeg: 14, direction: -1 },
  { inset: 34, dashArray: '2 22', baseOpacity: 0.12, speedDeg: 28, direction: 1 },
];

/* ---------- helper: liquid morph border-radius keyframes ---------- */
const morphShapes = [
  '60% 40% 55% 45% / 45% 60% 40% 55%',
  '45% 55% 40% 60% / 55% 40% 60% 45%',
  '50% 50% 45% 55% / 40% 55% 50% 50%',
  '55% 45% 60% 40% / 50% 45% 55% 50%',
  '40% 60% 50% 50% / 60% 45% 40% 55%',
];

/**
 * VoiceOrb -- Ultramodern hero visual for voice mode.
 *
 * Pure CSS + React animated orb with orbiting particles, concentric SVG rings,
 * noise texture, multi-layer neon glow, liquid morph, particle burst,
 * and a geometric crosshair center.
 */
export function VoiceOrb({ state, inputLevel, outputLevel }: VoiceOrbProps) {
  const level = state === 'listening' ? inputLevel : state === 'speaking' ? outputLevel : 0;
  const prevStateRef = useRef<VoiceState>(state);
  const [showBurst, setShowBurst] = useState(false);
  const burstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --- Particle burst on listening -> thinking transition --- */
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (prev === 'listening' && state === 'thinking') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reacting to prop transition
      setShowBurst(true);
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
      burstTimeoutRef.current = setTimeout(() => setShowBurst(false), 700);
    }

    return () => {
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
    };
  }, [state]);

  /* ---------- computed values ---------- */
  const isIdle = state === 'idle';
  const isThinking = state === 'thinking' || state === 'executing';
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isExecuting = state === 'executing';
  const primary = isExecuting ? '#ED4609' : isThinking ? BLUE : LIME;
  const primaryRGB = isExecuting ? '237,70,9' : isThinking ? '0,153,255' : '209,255,0';

  /* --- Outer multi-layer glow --- */
  const glowStyle = useMemo(() => {
    const s1 = 8 + level * 15;
    const s2 = 20 + level * 35;
    const s3 = 45 + level * 60;
    const s4 = 80 + level * 90;
    const s5 = 120 + level * 120;

    const a1 = isIdle ? 0.15 : 0.6 + level * 0.4;
    const a2 = a1 * 0.6;
    const a3 = a1 * 0.35;
    const a4 = a1 * 0.18;
    const a5 = a1 * 0.08;

    return {
      boxShadow: [
        `0 0 ${s1}px rgba(${primaryRGB},${a1})`,
        `0 0 ${s2}px rgba(${primaryRGB},${a2})`,
        `0 0 ${s3}px rgba(${primaryRGB},${a3})`,
        `0 0 ${s4}px rgba(${primaryRGB},${a4})`,
        `0 0 ${s5}px rgba(${primaryRGB},${a5})`,
        `inset 0 0 ${30 + level * 30}px rgba(${primaryRGB},${isIdle ? 0.05 : 0.15 + level * 0.2})`,
      ].join(', '),
      opacity: isIdle ? 0.45 : 1,
      transition: 'box-shadow 0.12s ease-out, opacity 0.5s ease',
    };
  }, [level, primaryRGB, isIdle]);

  /* --- Inner orb styles --- */
  const innerOrbStyle = useMemo(() => {
    let scale = 1;
    if (isListening) scale = 1 + inputLevel * 0.22;
    if (isSpeaking) scale = 1 + outputLevel * 0.18;

    // Noise-like layered gradient
    const noiseLayer1 = `radial-gradient(ellipse at ${30 + level * 40}% ${40 - level * 20}%, rgba(${primaryRGB},${isIdle ? 0.08 : 0.25 + level * 0.2}) 0%, transparent 60%)`;
    const noiseLayer2 = `radial-gradient(ellipse at ${70 - level * 30}% ${65 + level * 15}%, rgba(${primaryRGB},${isIdle ? 0.05 : 0.15 + level * 0.15}) 0%, transparent 55%)`;
    const noiseLayer3 = `radial-gradient(ellipse at ${55 + level * 15}% ${25 + level * 25}%, rgba(${primaryRGB},${isIdle ? 0.03 : 0.1 + level * 0.1}) 0%, transparent 50%)`;
    const baseBg = `radial-gradient(circle at 50% 50%, rgba(${primaryRGB},${isIdle ? 0.04 : 0.08}) 0%, ${BG} 75%)`;

    let background: string;
    if (isThinking) {
      background = `conic-gradient(from var(--orb-angle, 0deg), ${LIME}44, ${BLUE}88, ${LIME}44), ${noiseLayer1}, ${noiseLayer2}, ${baseBg}`;
    } else {
      background = `${noiseLayer1}, ${noiseLayer2}, ${noiseLayer3}, ${baseBg}`;
    }

    const borderRadius = isSpeaking
      ? `var(--orb-morph, 50%)`
      : '50%';

    const insetGlow = isIdle ? 0.1 : isThinking ? 0.3 : 0.4 + level * 0.5;

    return {
      background,
      borderRadius,
      boxShadow: `inset 0 0 ${50 + level * 50}px rgba(${primaryRGB},${insetGlow})`,
      transform: `scale(${scale})`,
      transition: isThinking
        ? 'box-shadow 0.3s ease, background 0.4s ease'
        : 'transform 0.06s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.12s ease-out, background 0.25s ease, border-radius 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
      backdropFilter: 'blur(2px)',
    };
  }, [inputLevel, outputLevel, level, primaryRGB, isIdle, isThinking, isListening, isSpeaking]);

  /* --- Particle orbit speed and color --- */
  const particleOrbitDuration = isThinking ? 3 : isIdle ? 12 : 8 - level * 3;
  const particleColor = isThinking ? BLUE : LIME;
  const particleSizeMultiplier = isIdle ? 0.7 : 1 + level * 0.8;
  const particleOpacity = isIdle ? 0.3 : 0.5 + level * 0.5;

  /* --- Ring opacity boost with audio --- */
  const ringOpacityBoost = isIdle ? 0 : level * 0.3;

  /* --- Crosshair center --- */
  const crosshairSize = 18 + level * 8;
  const crosshairColor = primary;
  const crosshairOpacity = isIdle ? 0.4 : 0.7 + level * 0.3;
  const crosshairGlow = `0 0 ${6 + level * 10}px ${primary}, 0 0 ${12 + level * 20}px rgba(${primaryRGB},0.3)`;

  return (
    <>
      <style>{`
        @property --orb-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @property --orb-morph {
          syntax: '*';
          inherits: false;
        }
        @property --noise-x1 {
          syntax: '<percentage>';
          initial-value: 30%;
          inherits: false;
        }
        @property --noise-y1 {
          syntax: '<percentage>';
          initial-value: 40%;
          inherits: false;
        }
        @property --noise-x2 {
          syntax: '<percentage>';
          initial-value: 70%;
          inherits: false;
        }
        @property --noise-y2 {
          syntax: '<percentage>';
          initial-value: 60%;
          inherits: false;
        }

        @keyframes voiceOrb-idle-pulse {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.035); opacity: 0.55; }
        }

        @keyframes voiceOrb-think-spin {
          from { --orb-angle: 0deg; }
          to { --orb-angle: 360deg; }
        }

        @keyframes voiceOrb-glow-breathe {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.6; }
        }

        @keyframes voiceOrb-morph {
          0%   { border-radius: ${morphShapes[0]}; }
          20%  { border-radius: ${morphShapes[1]}; }
          40%  { border-radius: ${morphShapes[2]}; }
          60%  { border-radius: ${morphShapes[3]}; }
          80%  { border-radius: ${morphShapes[4]}; }
          100% { border-radius: ${morphShapes[0]}; }
        }

        @keyframes voiceOrb-particle-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes voiceOrb-particle-orbit-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes voiceOrb-ring-rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes voiceOrb-ring-rotate-reverse {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }

        @keyframes voiceOrb-burst {
          0% {
            transform: translate(-50%, -50%) scale(0.4);
            opacity: 1;
            border-width: 3px;
          }
          60% {
            opacity: 0.6;
            border-width: 2px;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.2);
            opacity: 0;
            border-width: 0.5px;
          }
        }

        @keyframes voiceOrb-burst-dot {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(var(--burst-dx), var(--burst-dy)) scale(0);
            opacity: 0;
          }
        }

        @keyframes voiceOrb-crosshair-pulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.55; transform: translate(-50%, -50%) scale(1.1); }
        }

        @keyframes voiceOrb-noise-drift {
          0% { --noise-x1: 25%; --noise-y1: 35%; --noise-x2: 75%; --noise-y2: 65%; }
          33% { --noise-x1: 45%; --noise-y1: 55%; --noise-x2: 55%; --noise-y2: 40%; }
          66% { --noise-x1: 35%; --noise-y1: 25%; --noise-x2: 65%; --noise-y2: 70%; }
          100% { --noise-x1: 25%; --noise-y1: 35%; --noise-x2: 75%; --noise-y2: 65%; }
        }

        @keyframes voiceOrb-scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .voiceOrb-morph-active {
          animation: voiceOrb-morph 6s ease-in-out infinite !important;
        }
      `}</style>

      <div
        className="relative w-[280px] h-[280px] flex-shrink-0"
        role="img"
        aria-label={`Voice orb - ${state}`}
      >
        {/* === CONCENTRIC SVG RINGS === */}
        {ringConfigs.map((ring, idx) => {
          const diameter = 280 - ring.inset * 2;
          const r = diameter / 2 - 1;
          const cx = diameter / 2;
          const cy = diameter / 2;
          const adjustedOpacity = Math.min(1, ring.baseOpacity + ringOpacityBoost);
          const duration = 360 / ring.speedDeg;

          return (
            <div
              key={idx}
              className="absolute pointer-events-none"
              style={{
                top: '50%',
                left: '50%',
                width: diameter,
                height: diameter,
                animation: `${ring.direction > 0 ? 'voiceOrb-ring-rotate' : 'voiceOrb-ring-rotate-reverse'} ${duration}s linear infinite`,
              }}
            >
              <svg
                width={diameter}
                height={diameter}
                viewBox={`0 0 ${diameter} ${diameter}`}
                fill="none"
                style={{ overflow: 'visible' }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={primary}
                  strokeWidth={idx === 0 ? 1.5 : 1}
                  strokeDasharray={ring.dashArray}
                  strokeLinecap="round"
                  opacity={adjustedOpacity}
                  style={{
                    filter: `drop-shadow(0 0 ${3 + level * 4}px rgba(${primaryRGB},${adjustedOpacity * 0.6}))`,
                    transition: 'stroke 0.4s ease, opacity 0.3s ease, filter 0.3s ease',
                  }}
                />
              </svg>
            </div>
          );
        })}

        {/* === PARTICLE ORBIT RING === */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            animation: `voiceOrb-particle-orbit ${particleOrbitDuration}s linear infinite`,
            transition: 'animation-duration 0.5s ease',
          }}
        >
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const cx = 140 + Math.cos(rad) * p.orbitRadius;
            const cy = 140 + Math.sin(rad) * p.orbitRadius;
            const size = p.size * particleSizeMultiplier;

            return (
              <div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  left: cx - size / 2,
                  top: cy - size / 2,
                  background: particleColor,
                  opacity: particleOpacity,
                  boxShadow: `0 0 ${4 + level * 6}px ${particleColor}, 0 0 ${8 + level * 10}px rgba(${primaryRGB},0.3)`,
                  transition: 'background 0.4s ease, opacity 0.3s ease, box-shadow 0.2s ease, width 0.15s ease, height 0.15s ease',
                }}
              />
            );
          })}
        </div>

        {/* === OUTER GLOW SHELL === */}
        <div
          className="absolute inset-[10px] rounded-full"
          style={{
            ...glowStyle,
            animation: isIdle ? 'voiceOrb-glow-breathe 4s ease-in-out infinite' : undefined,
          }}
        />

        {/* === MAIN ORB BODY === */}
        <div
          className={[
            'absolute inset-[16px] border border-opacity-20 overflow-hidden',
            isIdle ? 'animate-[voiceOrb-idle-pulse_3.5s_ease-in-out_infinite]' : '',
            isThinking ? 'animate-[voiceOrb-think-spin_2.2s_linear_infinite]' : '',
            isSpeaking ? 'voiceOrb-morph-active' : '',
          ].join(' ')}
          style={{
            ...innerOrbStyle,
            borderColor: `rgba(${primaryRGB}, 0.2)`,
          }}
        >
          {/* Noise texture overlay (animated gradient layers) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                `radial-gradient(circle at 30% 70%, rgba(${primaryRGB},0.06) 0%, transparent 40%)`,
                `radial-gradient(circle at 80% 20%, rgba(${primaryRGB},0.04) 0%, transparent 35%)`,
                `radial-gradient(circle at 50% 50%, rgba(${primaryRGB},0.03) 0%, transparent 50%)`,
              ].join(', '),
              animation: 'voiceOrb-noise-drift 8s ease-in-out infinite',
              mixBlendMode: 'screen',
            }}
          />

          {/* Scanline overlay */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ opacity: 0.06, borderRadius: 'inherit' }}
          >
            <div
              className="w-full"
              style={{
                height: '200%',
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                animation: 'voiceOrb-scanline 4s linear infinite',
              }}
            />
          </div>

          {/* Inner bright spot */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${45 + level * 10}% ${45 - level * 5}%, rgba(${primaryRGB},${isIdle ? 0.06 : 0.15 + level * 0.2}) 0%, transparent 45%)`,
              transition: 'background 0.2s ease-out',
            }}
          />
        </div>

        {/* === ORB EDGE HIGHLIGHT === */}
        <div
          className="absolute inset-[16px] rounded-full pointer-events-none"
          style={{
            border: `1px solid rgba(${primaryRGB}, ${isIdle ? 0.08 : 0.15 + level * 0.15})`,
            background: `linear-gradient(135deg, rgba(${primaryRGB},${isIdle ? 0.03 : 0.06 + level * 0.04}) 0%, transparent 50%, rgba(${primaryRGB},${isIdle ? 0.01 : 0.03}) 100%)`,
            borderRadius: isSpeaking ? 'var(--orb-morph, 50%)' : '50%',
            transition: 'border-color 0.3s ease, background 0.3s ease, border-radius 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
            animation: isSpeaking ? 'voiceOrb-morph 6s ease-in-out infinite' : undefined,
          }}
        />

        {/* === PARTICLE BURST (listening -> thinking) === */}
        {showBurst && (
          <>
            {/* Expanding ring */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '50%',
                left: '50%',
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: `2px solid ${BLUE}`,
                animation: 'voiceOrb-burst 0.7s ease-out forwards',
                boxShadow: `0 0 20px ${BLUE}, 0 0 40px rgba(0,153,255,0.3)`,
              }}
            />
            {/* Burst dots */}
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (360 / 10) * i;
              const rad = (angle * Math.PI) / 180;
              const dist = BURST_DISTANCES[i];
              return (
                <div
                  key={`burst-${i}`}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    top: '50%',
                    left: '50%',
                    width: 3,
                    height: 3,
                    background: BLUE,
                    boxShadow: `0 0 6px ${BLUE}`,
                    ['--burst-dx' as string]: `${Math.cos(rad) * dist}px`,
                    ['--burst-dy' as string]: `${Math.sin(rad) * dist}px`,
                    animation: 'voiceOrb-burst-dot 0.6s ease-out forwards',
                    animationDelay: `${i * 0.02}s`,
                  }}
                />
              );
            })}
          </>
        )}

        {/* === CROSSHAIR CENTER === */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            width: crosshairSize,
            height: crosshairSize,
            transform: 'translate(-50%, -50%)',
            opacity: crosshairOpacity,
            filter: `drop-shadow(${crosshairGlow.split(',')[0]})`,
            transition: 'all 0.2s ease-out',
            animation: isIdle ? 'voiceOrb-crosshair-pulse 3s ease-in-out infinite' : undefined,
          }}
        >
          {/* Horizontal line */}
          <div
            className="absolute"
            style={{
              top: '50%',
              left: '15%',
              right: '15%',
              height: 1.5,
              background: crosshairColor,
              transform: 'translateY(-50%)',
              boxShadow: crosshairGlow,
            }}
          />
          {/* Vertical line */}
          <div
            className="absolute"
            style={{
              left: '50%',
              top: '15%',
              bottom: '15%',
              width: 1.5,
              background: crosshairColor,
              transform: 'translateX(-50%)',
              boxShadow: crosshairGlow,
            }}
          />
          {/* Center diamond */}
          <div
            className="absolute"
            style={{
              top: '50%',
              left: '50%',
              width: 5 + level * 3,
              height: 5 + level * 3,
              background: crosshairColor,
              transform: 'translate(-50%, -50%) rotate(45deg)',
              boxShadow: `0 0 ${8 + level * 12}px ${crosshairColor}, 0 0 ${16 + level * 20}px rgba(${primaryRGB},0.4)`,
              transition: 'all 0.1s ease-out',
            }}
          />
          {/* Corner ticks */}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const tickDist = crosshairSize * 0.38;
            const tx = Math.cos(rad) * tickDist;
            const ty = Math.sin(rad) * tickDist;
            const isHoriz = deg === 0 || deg === 180;
            return (
              <div
                key={`tick-${deg}`}
                className="absolute"
                style={{
                  top: '50%',
                  left: '50%',
                  width: isHoriz ? 4 : 1.5,
                  height: isHoriz ? 1.5 : 4,
                  background: crosshairColor,
                  transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
                  opacity: 0.7,
                  boxShadow: `0 0 4px ${crosshairColor}`,
                }}
              />
            );
          })}
        </div>

        {/* === STATUS INDICATOR (subtle bottom dot) === */}
        <div
          className="absolute"
          style={{
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: primary,
            opacity: isIdle ? 0.3 : 0.8,
            boxShadow: `0 0 8px ${primary}`,
            transition: 'all 0.3s ease',
          }}
        />
      </div>
    </>
  );
}

export default VoiceOrb;
