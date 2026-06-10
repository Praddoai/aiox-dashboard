import { useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceStore } from '../../stores/voiceStore';
import type { VoiceState, TranscriptEntry } from '../../stores/voiceStore';
import { Avatar } from '../ui/Avatar';
import { VoiceOrb } from './VoiceOrb';
import { VoiceTranscript } from './VoiceTranscript';
import { VoiceControls } from './VoiceControls';
import { GeminiVoiceControls } from './GeminiVoiceControls';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceSettings } from './VoiceSettings';
import { useGeminiLive } from '../../hooks/useGeminiLive';

interface VoiceModeProps {
  agentId?: string;
  agentName?: string;
  squadId?: string;
  timeDomainData?: Uint8Array | null;
  isSupported?: boolean;
  history?: TranscriptEntry[];
  onPTTDown?: () => void;
  onPTTUp?: () => void;
  onClose?: () => void;
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'MODO VOZ ATIVO',
  listening: 'ESCUTANDO',
  thinking: 'PROCESSANDO',
  speaking: 'RESPONDENDO',
  executing: 'EXECUTANDO VIA CLAUDE CODE',
};

/**
 * VoiceMode -- Fullscreen overlay container for voice interaction.
 * Portaled to document.body to escape any ancestor transforms.
 * Reads state from useVoiceStore and composes all voice sub-components.
 */
export function VoiceMode({
  agentId,
  agentName = 'AGENTE',
  squadId,
  timeDomainData = null,
  isSupported = true,
  history = [],
  onPTTDown,
  onPTTUp,
  onClose,
}: VoiceModeProps) {
  const {
    isActive,
    state,
    userTranscript,
    agentTranscript,
    inputLevel,
    outputLevel,
    isMuted,
    showSettings,
    language,
    selectedDeviceId,
    voiceBackend,
    error,
    deactivate,
    toggleMute,
    toggleSettings,
    setLanguage,
    setSelectedDeviceId,
  } = useVoiceStore();

  const isGeminiMode = voiceBackend === 'gemini-live';
  const gemini = useGeminiLive();

  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClose = useMemo(() => {
    return () => {
      onClose?.();
      deactivate();
    };
  }, [onClose, deactivate]);

  const handlePTTDown = useMemo(() => {
    return () => onPTTDown?.();
  }, [onPTTDown]);

  const handlePTTUp = useMemo(() => {
    return () => onPTTUp?.();
  }, [onPTTUp]);

  // Focus trap: prevent Tab from leaving the overlay
  useEffect(() => {
    if (!isActive) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !overlayRef.current) return;

      const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
        'button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [isActive]);

  // Lock body scroll when voice mode is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive]);

  const stateLabel = STATE_LABELS[state];
  const waveformActive = state === 'listening' || state === 'speaking';

  // Merge store history with prop history
  const storeHistory = useVoiceStore((s) => s.conversationHistory);
  const mergedHistory = storeHistory.length > 0 ? storeHistory : history;

  return createPortal(
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={overlayRef}
          key="voice-overlay"
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
          style={{ background: '#050505' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label="Modo voz"
        >
          {/* Animated gradient backdrop */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                state === 'thinking'
                  ? 'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,153,255,0.08) 0%, transparent 70%)'
                  : state === 'listening'
                    ? 'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(209,255,0,0.06) 0%, transparent 70%)'
                    : state === 'speaking'
                      ? 'radial-gradient(ellipse 90% 70% at 50% 45%, rgba(209,255,0,0.08) 0%, transparent 65%)'
                      : 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(209,255,0,0.03) 0%, transparent 70%)',
              transition: 'background 0.8s ease',
            }}
          />

          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(209,255,0,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)',
              animation: 'vm-scanline-scroll 8s linear infinite',
            }}
          />

          {/* Agent info -- top center */}
          <div className="absolute top-6 left-0 right-0 flex flex-col items-center gap-2 z-10">
            <div className="relative">
              <Avatar
                name={agentName}
                agentId={agentId}
                size="lg"
                squadType={squadId as 'default' | undefined}
              />
              {/* Status ring around avatar */}
              <div
                className="absolute -inset-1 rounded-full border pointer-events-none"
                style={{
                  borderColor:
                    state === 'thinking'
                      ? 'rgba(0,153,255,0.3)'
                      : state === 'idle'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(209,255,0,0.3)',
                  transition: 'border-color 0.4s ease',
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] uppercase tracking-[0.1em] font-mono text-white/50">
                {agentName.toUpperCase()}
              </span>
              {/* State label with indicator */}
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      state === 'thinking'
                        ? '#0099FF'
                        : state === 'idle'
                          ? 'rgba(209,255,0,0.3)'
                          : '#D1FF00',
                    boxShadow:
                      state === 'idle'
                        ? 'none'
                        : state === 'thinking'
                          ? '0 0 6px #0099FF'
                          : '0 0 6px #D1FF00',
                    animation:
                      state === 'listening' || state === 'speaking'
                        ? 'vm-dot-pulse 1.5s ease-in-out infinite'
                        : state === 'thinking'
                          ? 'vm-dot-pulse 0.8s ease-in-out infinite'
                          : 'none',
                  }}
                />
                <span
                  className="text-[9px] uppercase tracking-[0.12em] font-mono"
                  style={{
                    color:
                      state === 'thinking'
                        ? 'rgba(0,153,255,0.7)'
                        : state === 'idle'
                          ? 'rgba(255,255,255,0.25)'
                          : 'rgba(209,255,0,0.6)',
                    transition: 'color 0.4s ease',
                  }}
                >
                  {stateLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Center content */}
          <div className="flex flex-col items-center gap-6 z-10">
            <VoiceOrb
              state={state}
              inputLevel={isMuted ? 0 : inputLevel}
              outputLevel={outputLevel}
            />

            <VoiceTranscript
              userTranscript={userTranscript}
              agentTranscript={agentTranscript}
              state={state}
              history={mergedHistory}
            />
          </div>

          {/* Error toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="voice-error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20"
              >
                <div
                  className="px-4 py-2 rounded-none border border-red-500/30 font-mono text-xs text-red-400"
                  style={{ background: 'rgba(220,38,38,0.1)', backdropFilter: 'blur(8px)' }}
                >
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom area -- controls + waveform */}
          <div className="absolute bottom-0 left-0 right-0 pb-6 flex flex-col items-center gap-4 z-10">
            <VoiceWaveform
              timeDomainData={timeDomainData}
              isActive={waveformActive}
              state={state}
            />
            {isGeminiMode ? (
              <GeminiVoiceControls
                isConnected={gemini.isConnected}
                isSpeaking={gemini.isSpeaking}
                onConnect={gemini.connect}
                onDisconnect={gemini.disconnect}
                onPttDown={gemini.pttDown}
                onPttUp={gemini.pttUp}
                onClose={handleClose}
                onToggleMute={toggleMute}
                onToggleSettings={toggleSettings}
                state={state}
                isMuted={isMuted}
                showSettings={showSettings}
                inputLevel={inputLevel}
              />
            ) : (
              <VoiceControls
                onPTTDown={handlePTTDown}
                onPTTUp={handlePTTUp}
                onClose={handleClose}
                onToggleMute={toggleMute}
                onToggleSettings={toggleSettings}
                state={state}
                isSupported={isSupported}
                isMuted={isMuted}
                showSettings={showSettings}
                inputLevel={inputLevel}
              />
            )}
          </div>

          {/* Settings panel */}
          <VoiceSettings
            isOpen={showSettings}
            language={language}
            selectedDeviceId={selectedDeviceId}
            onLanguageChange={setLanguage}
            onDeviceChange={setSelectedDeviceId}
            onClose={toggleSettings}
          />

          {/* HUD corner brackets */}
          <HudCorner position="top-left" state={state} />
          <HudCorner position="top-right" state={state} />
          <HudCorner position="bottom-left" state={state} />
          <HudCorner position="bottom-right" state={state} />

          {/* Version tag */}
          <div className="absolute bottom-3 left-4 text-[8px] font-mono text-white/10 uppercase tracking-widest">
            {isGeminiMode ? 'GEMINI LIVE — NATIVE AUDIO' : 'AIOS VOICE v1.0'}
          </div>

          {/* Inject keyframes */}
          <style>{`
            @keyframes vm-scanline-scroll {
              from { background-position: 0 0; }
              to { background-position: 0 100vh; }
            }
            @keyframes vm-dot-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------- HUD Corner Bracket ---------- */

function HudCorner({
  position,
  state,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  state: VoiceState;
}) {
  const isTop = position.startsWith('top');
  const isLeft = position.endsWith('left');

  const color =
    state === 'thinking'
      ? 'rgba(0,153,255,0.2)'
      : state === 'idle'
        ? 'rgba(209,255,0,0.1)'
        : 'rgba(209,255,0,0.2)';

  return (
    <div
      className="absolute w-8 h-8 pointer-events-none"
      style={{
        top: isTop ? 16 : undefined,
        bottom: !isTop ? 16 : undefined,
        left: isLeft ? 16 : undefined,
        right: !isLeft ? 16 : undefined,
      }}
    >
      <div
        className="absolute"
        style={{
          [isTop ? 'top' : 'bottom']: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: '100%',
          height: 1,
          background: color,
          transition: 'background 0.4s ease',
        }}
      />
      <div
        className="absolute"
        style={{
          [isTop ? 'top' : 'bottom']: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: 1,
          height: '100%',
          background: color,
          transition: 'background 0.4s ease',
        }}
      />
    </div>
  );
}

export default VoiceMode;
