import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';
import type { VoiceState } from '../../stores/voiceStore';

interface GeminiVoiceControlsProps {
  isConnected: boolean;
  isSpeaking: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onClose: () => void;
  onToggleMute: () => void;
  onToggleSettings: () => void;
  onPttDown: () => void;
  onPttUp: () => void;
  state: VoiceState;
  isMuted: boolean;
  showSettings?: boolean;
  inputLevel: number;
}

/* ---- Icons ---- */

// Bolt/power icon — shown on main button before connecting
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// Mic icon — shown on main button when connected (PTT active)
function MicIcon({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// Stop icon — shown on main button when connected (to disconnect)
function StopIcon({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

// Volume icon — shown on mute button when unmuted
function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

// Volume off icon — shown on mute button when muted
function VolumeOffIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
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

/* ---- Audio Level Ring ---- */

const RING_SIZE = 104;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function AudioLevelRing({ level, active }: { level: number; active: boolean }) {
  const clamped = Math.max(0, Math.min(1, level));
  const offset = RING_CIRCUMFERENCE * (1 - clamped);

  return (
    <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0 m-auto pointer-events-none" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="rgba(0,200,255,0.08)" strokeWidth={RING_STROKE} />
      <circle
        cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
        fill="none"
        stroke={active ? '#00C8FF' : 'rgba(0,200,255,0.25)'}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 80ms linear, stroke 200ms ease',
          filter: active && clamped > 0.4 ? 'drop-shadow(0 0 4px rgba(0,200,255,0.6))' : 'none',
        }}
      />
    </svg>
  );
}

/* ---- Component ---- */

export function GeminiVoiceControls({
  isConnected,
  isSpeaking,
  onConnect,
  onDisconnect,
  onClose,
  onToggleMute,
  onToggleSettings,
  onPttDown,
  onPttUp,
  state,
  isMuted,
  showSettings = false,
  inputLevel,
}: GeminiVoiceControlsProps) {
  const [showRipple, setShowRipple] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const rippleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pttActiveRef = useRef(false);

  const isActive = isConnected && (isSpeaking || state === 'speaking');

  useEffect(() => {
    const timer = setTimeout(() => setShowHints(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const triggerRipple = useCallback(() => {
    setShowRipple(true);
    if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
    rippleTimeoutRef.current = setTimeout(() => setShowRipple(false), 600);
  }, []);

  useEffect(() => {
    return () => { if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current); };
  }, []);

  const handleClick = useCallback(() => {
    if (isConnected) {
      onDisconnect();
    } else {
      triggerRipple();
      onConnect();
    }
  }, [isConnected, onConnect, onDisconnect, triggerRipple]);

  // Keyboard: Escape to close, Space for PTT (hold to talk)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === ' ' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        if (!isConnected) {
          triggerRipple();
          onConnect();
        } else {
          pttActiveRef.current = true;
          onPttDown();
        }
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        if (pttActiveRef.current) {
          pttActiveRef.current = false;
          onPttUp();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onClose, isConnected, onConnect, onPttDown, onPttUp, triggerRipple]);

  const stateLabel = (() => {
    if (!isConnected) return 'CLIQUE PARA CONECTAR';
    if (isMuted) return 'MICROFONE SILENCIADO';
    if (isSpeaking) return 'GRAVANDO... SOLTE PARA ENVIAR';
    switch (state) {
      case 'speaking': return 'GEMINI RESPONDENDO...';
      case 'thinking': return 'PROCESSANDO...';
      default: return 'SEGURE SPACE PARA FALAR';
    }
  })();

  const showPulsingDot = isConnected && (isSpeaking || state === 'speaking');

  return (
    <>
      {/* Close */}
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

      {/* Controls row */}
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center justify-center gap-6">
          {/* Mute */}
          <button
            onClick={onToggleMute}
            className={cn(
              'w-10 h-10 rounded-full border flex items-center justify-center',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8FF]/50',
              isMuted
                ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white/80 hover:border-white/30',
            )}
            aria-label={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
          >
            {isMuted ? <VolumeOffIcon /> : <VolumeIcon />}
          </button>

          {/* Main button */}
          <div className="relative flex items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <AudioLevelRing level={inputLevel} active={isActive} />

            {showRipple && (
              <span className="gvc-ripple absolute inset-0 m-auto rounded-full pointer-events-none" style={{ width: 88, height: 88 }} aria-hidden="true" />
            )}

            <button
              onClick={handleClick}
              aria-label={isConnected ? 'Desconectar Gemini Live' : 'Conectar Gemini Live'}
              className={cn(
                'relative z-[1] rounded-full border-2 flex items-center justify-center',
                'transition-all duration-150 select-none touch-none',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]',
                'w-[88px] h-[88px]',
                // Disconnected
                !isConnected && 'border-[#00C8FF]/60 text-[#00C8FF]/60 hover:border-[#00C8FF] hover:text-[#00C8FF]',
                // Connected & active
                isActive && !isMuted && 'border-[#00C8FF] text-[#00C8FF] bg-[#00C8FF]/20',
                // Muted
                isMuted && isConnected && 'border-red-500/40 text-red-400 bg-red-500/10',
              )}
              style={{
                ...(isActive && !isMuted ? {
                  boxShadow: '0 0 24px rgba(0,200,255,0.35), 0 0 48px rgba(0,200,255,0.15), inset 0 0 20px rgba(0,200,255,0.12)',
                  animation: 'gvc-border-pulse 1s ease-in-out infinite',
                } : {}),
              }}
            >
              {isActive && !isMuted && (
                <span
                  className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                  style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,200,255,0.04) 3px, rgba(0,200,255,0.04) 4px)',
                  }}
                  aria-hidden="true"
                />
              )}

              {!isConnected ? (
                <BoltIcon className="relative z-[1]" />
              ) : isActive && !isMuted ? (
                <MicIcon className="relative z-[1] transition-transform duration-150 scale-[1.15]" />
              ) : (
                <StopIcon className="relative z-[1]" />
              )}
            </button>
          </div>

          {/* Settings */}
          <button
            onClick={onToggleSettings}
            className={cn(
              'w-10 h-10 rounded-full border flex items-center justify-center',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C8FF]/50',
              showSettings
                ? 'bg-[#00C8FF]/15 text-[#00C8FF] border-[#00C8FF]/40'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white/80 hover:border-white/30',
            )}
            aria-label="Configuracoes de voz"
            aria-expanded={showSettings}
          >
            <SettingsIcon />
          </button>
        </div>

        {/* State label */}
        <span
          className={cn(
            'flex items-center gap-1.5',
            'text-[10px] uppercase tracking-[0.08em] font-mono text-center',
            !isConnected ? 'text-white/40' : isMuted ? 'text-red-400/80' : 'text-[#00C8FF]/60',
          )}
        >
          {showPulsingDot && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#00C8FF]"
              style={{ animation: 'gvc-dot-pulse 1.2s ease-in-out infinite' }}
              aria-hidden="true"
            />
          )}
          {stateLabel}
        </span>

        {/* Gemini badge */}
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00C8FF]/40" />
          <span className="text-[8px] font-mono text-[#00C8FF]/30 uppercase tracking-[0.1em]">
            GEMINI LIVE — NATIVE AUDIO
          </span>
        </div>

        {/* Hints */}
        <div className={cn('flex items-center gap-3 transition-opacity duration-700', showHints ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] font-mono text-white/25 bg-white/5 border border-white/10 rounded">
              SPACE
            </kbd>
            <span className="text-[9px] text-white/15 font-mono">{isConnected ? 'SEGURE P/ FALAR' : 'CONECTAR'}</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] font-mono text-white/25 bg-white/5 border border-white/10 rounded">
              ESC
            </kbd>
            <span className="text-[9px] text-white/15 font-mono">SAIR</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gvc-border-pulse {
          0%, 100% { border-color: #00C8FF; }
          50% { border-color: rgba(0,200,255,0.5); }
        }
        @keyframes gvc-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes gvc-ripple-expand {
          0% { transform: scale(1); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0,200,255,0.4); }
          100% { transform: scale(1.55); opacity: 0; box-shadow: 0 0 0 6px rgba(0,200,255,0); }
        }
        .gvc-ripple {
          border: 2px solid rgba(0,200,255,0.5);
          animation: gvc-ripple-expand 600ms ease-out forwards;
        }
      `}</style>
    </>
  );
}

export default GeminiVoiceControls;
