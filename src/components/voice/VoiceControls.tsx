import { useEffect, useCallback, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import type { VoiceState } from '../../stores/voiceStore';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface VoiceControlsProps {
  onPTTDown: () => void;
  onPTTUp: () => void;
  onClose: () => void;
  onToggleMute: () => void;
  onToggleSettings: () => void;
  state: VoiceState;
  isSupported: boolean;
  isMuted: boolean;
  showSettings?: boolean;
  /** Audio input level 0-1, drives the SVG ring visualization. */
  inputLevel: number;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                   */
/* ------------------------------------------------------------------ */

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Audio Level Ring (SVG)                                             */
/* ------------------------------------------------------------------ */

const RING_SIZE = 104; // px — slightly larger than the 88px button
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function AudioLevelRing({ level, active }: { level: number; active: boolean }) {
  const clamped = Math.max(0, Math.min(1, level));
  const offset = RING_CIRCUMFERENCE * (1 - clamped);

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      className="absolute inset-0 m-auto pointer-events-none"
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden="true"
    >
      {/* Background track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="rgba(209,255,0,0.08)"
        strokeWidth={RING_STROKE}
      />
      {/* Level fill */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={active ? '#D1FF00' : 'rgba(209,255,0,0.25)'}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 80ms linear, stroke 200ms ease',
          filter: active && clamped > 0.4 ? 'drop-shadow(0 0 4px rgba(209,255,0,0.6))' : 'none',
        }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function VoiceControls({
  onPTTDown,
  onPTTUp,
  onClose,
  onToggleMute,
  onToggleSettings,
  state,
  isSupported,
  isMuted,
  showSettings = false,
  inputLevel,
}: VoiceControlsProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const spaceHeldRef = useRef(false);
  const rippleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDisabled = state === 'thinking' || state === 'speaking';
  const isListening = state === 'listening';
  const isActive = isPressed || isListening;

  /* ---- Keyboard hints auto-fade ---- */
  useEffect(() => {
    const timer = setTimeout(() => setShowHints(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  /* ---- Ripple trigger ---- */
  const triggerRipple = useCallback(() => {
    setShowRipple(true);
    if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
    rippleTimeoutRef.current = setTimeout(() => setShowRipple(false), 600);
  }, []);

  useEffect(() => {
    return () => {
      if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
    };
  }, []);

  /* ---- Click toggle handler ---- */
  const handleClick = useCallback(() => {
    if (isDisabled || !isSupported) return;

    if (isListening) {
      // 2nd click → stop and process
      setIsPressed(false);
      onPTTUp();
    } else {
      // 1st click → start listening
      setIsPressed(true);
      triggerRipple();
      onPTTDown();
    }
  }, [isDisabled, isSupported, isListening, onPTTDown, onPTTUp, triggerRipple]);

  /* ---- Keyboard: Space to talk, Escape to close ---- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (
        e.key === ' ' &&
        !e.repeat &&
        !isDisabled &&
        isSupported &&
        !spaceHeldRef.current
      ) {
        e.preventDefault();
        spaceHeldRef.current = true;
        setIsPressed(true);
        triggerRipple();
        onPTTDown();
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === ' ' && spaceHeldRef.current) {
        e.preventDefault();
        spaceHeldRef.current = false;
        setIsPressed(false);
        onPTTUp();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDisabled, isSupported, onPTTDown, onPTTUp, onClose, triggerRipple]);

  /* ---- State label ---- */
  const stateLabel = (() => {
    if (!isSupported) return 'NAVEGADOR NAO SUPORTADO';
    if (isMuted) return 'MICROFONE SILENCIADO';
    switch (state) {
      case 'listening':
        return 'OUVINDO...';
      case 'thinking':
        return 'PROCESSANDO...';
      case 'speaking':
        return 'REPRODUZINDO...';
      default:
        return 'CLIQUE PARA FALAR';
    }
  })();

  const showPulsingDot = state === 'listening' && !isMuted;

  return (
    <>
      {/* ---- Close button ---- */}
      <button
        onClick={onClose}
        className={cn(
          'absolute top-6 right-6 z-10 p-2.5',
          'rounded-full border border-white/10',
          'text-white/40 hover:text-white/80 hover:border-white/30',
          'hover:scale-110 active:scale-95',
          'transition-all duration-200',
        )}
        aria-label="Fechar modo voz"
      >
        <CloseIcon />
      </button>

      {/* ---- Bottom controls row ---- */}
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center justify-center gap-6">
          {/* ---- Mute toggle ---- */}
          <button
            onClick={onToggleMute}
            className={cn(
              'w-10 h-10 rounded-full border flex items-center justify-center',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1FF00]/50',
              isMuted
                ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white/80 hover:border-white/30',
            )}
            aria-label={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
          >
            {isMuted ? <MicOffIcon /> : <MicIcon className="w-[18px] h-[18px]" />}
          </button>

          {/* ---- PTT button wrapper ---- */}
          <div className="relative flex items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
            {/* Audio level ring */}
            <AudioLevelRing level={inputLevel} active={isActive} />

            {/* Ripple */}
            {showRipple && (
              <span
                className="vc-ripple absolute inset-0 m-auto rounded-full pointer-events-none"
                style={{ width: 88, height: 88 }}
                aria-hidden="true"
              />
            )}

            {/* PTT Button */}
            <button
              onClick={handleClick}
              disabled={isDisabled || !isSupported}
              aria-label={isActive ? 'Gravando - clique para parar' : 'Clique para falar'}
              className={cn(
                'relative z-[1] rounded-full border-2 flex items-center justify-center',
                'transition-all duration-150 select-none touch-none',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1FF00]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]',
                // Size
                'w-[88px] h-[88px]',
                // Base idle
                !isActive && !isDisabled && !isMuted &&
                  'border-[#D1FF00]/60 text-[#D1FF00]/60 hover:border-[#D1FF00] hover:text-[#D1FF00]',
                // Active / listening
                isActive && !isMuted &&
                  'border-[#D1FF00] text-[#D1FF00] bg-[#D1FF00]/20',
                // Muted
                isMuted && !isDisabled &&
                  'border-red-500/40 text-red-400 bg-red-500/10',
                // Disabled (thinking / speaking)
                isDisabled &&
                  'border-white/20 text-white/20 opacity-50 cursor-not-allowed',
                // Not supported
                !isSupported &&
                  'border-red-500/40 text-red-500/40 cursor-not-allowed',
              )}
              style={{
                ...(isActive && !isMuted
                  ? {
                      boxShadow:
                        '0 0 24px rgba(209,255,0,0.35), 0 0 48px rgba(209,255,0,0.15), inset 0 0 20px rgba(209,255,0,0.12)',
                      animation: 'vc-border-pulse 1s ease-in-out infinite',
                    }
                  : {}),
              }}
            >
              {/* Scan-line overlay when active */}
              {isActive && !isMuted && (
                <span
                  className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(209,255,0,0.04) 3px, rgba(209,255,0,0.04) 4px)',
                  }}
                  aria-hidden="true"
                />
              )}

              <MicIcon
                className={cn(
                  'relative z-[1] transition-transform duration-150',
                  isActive && !isMuted && 'scale-[1.15]',
                )}
              />
            </button>
          </div>

          {/* ---- Settings button ---- */}
          <button
            onClick={onToggleSettings}
            className={cn(
              'w-10 h-10 rounded-full border flex items-center justify-center',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1FF00]/50',
              showSettings
                ? 'bg-[#D1FF00]/15 text-[#D1FF00] border-[#D1FF00]/40'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white/80 hover:border-white/30',
            )}
            aria-label="Configuracoes de voz"
            aria-expanded={showSettings}
          >
            <SettingsIcon />
          </button>
        </div>

        {/* ---- State label ---- */}
        <span
          className={cn(
            'flex items-center gap-1.5',
            'text-[10px] uppercase tracking-[0.08em] font-mono text-center',
            isDisabled ? 'text-white/20' : isMuted ? 'text-red-400/80' : 'text-white/40',
          )}
        >
          {showPulsingDot && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#D1FF00]"
              style={{ animation: 'vc-dot-pulse 1.2s ease-in-out infinite' }}
              aria-hidden="true"
            />
          )}
          {stateLabel}
        </span>

        {/* ---- Keyboard hints (auto-fade) ---- */}
        <div
          className={cn(
            'flex items-center gap-2 transition-opacity duration-700',
            showHints ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <kbd className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] font-mono text-white/25 bg-white/5 border border-white/10 rounded">
            ESPACO
          </kbd>
          <span className="text-[9px] text-white/15 font-mono">SEGURAR</span>
          <span className="text-white/10 text-[9px]">&middot;</span>
          <kbd className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] font-mono text-white/25 bg-white/5 border border-white/10 rounded">
            ESC
          </kbd>
          <span className="text-[9px] text-white/15 font-mono">SAIR</span>
        </div>
      </div>

      {/* ---- Injected keyframes ---- */}
      <style>{`
        @keyframes vc-border-pulse {
          0%, 100% { border-color: #D1FF00; }
          50% { border-color: rgba(209,255,0,0.5); }
        }

        @keyframes vc-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }

        @keyframes vc-ripple-expand {
          0% {
            transform: scale(1);
            opacity: 0.5;
            box-shadow: 0 0 0 0 rgba(209,255,0,0.4);
          }
          100% {
            transform: scale(1.55);
            opacity: 0;
            box-shadow: 0 0 0 6px rgba(209,255,0,0);
          }
        }

        .vc-ripple {
          border: 2px solid rgba(209,255,0,0.5);
          animation: vc-ripple-expand 600ms ease-out forwards;
        }
      `}</style>
    </>
  );
}

export default VoiceControls;
