import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import type { VoiceState, TranscriptEntry } from '../../stores/voiceStore';

interface VoiceTranscriptProps {
  userTranscript: string;
  agentTranscript: string;
  state: VoiceState;
  history: TranscriptEntry[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatRelativeTime(timestamp: number): string {
  const delta = Math.floor((Date.now() - timestamp) / 1000);
  if (delta < 5) return 'agora';
  if (delta < 60) return `${delta}s`;
  const mins = Math.floor(delta / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
}

/* ------------------------------------------------------------------ */
/*  Typewriter hook                                                   */
/* ------------------------------------------------------------------ */

function useTypewriter(text: string, active: boolean, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing display text when typewriter is inactive
      setDisplayed(text);
      indexRef.current = text.length;
      return;
    }

    // If new text is shorter than what we already revealed, reset
    if (text.length < indexRef.current) {
      indexRef.current = 0;
      setDisplayed('');
    }

    // If we already revealed everything, just sync
    if (indexRef.current >= text.length) {
      setDisplayed(text);
      return;
    }

    const timer = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, active, speed]);

  // Reset when switching away from active
  useEffect(() => {
    if (!active) {
      indexRef.current = 0;
    }
  }, [active]);

  return displayed;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function MessageBubble({
  role,
  text,
  timestamp,
  isNew = false,
}: {
  role: 'user' | 'agent';
  text: string;
  timestamp?: number;
  isNew?: boolean;
}) {
  const isAgent = role === 'agent';

  return (
    <div
      className={cn(
        'relative pl-3 py-2 pr-3 font-mono text-sm leading-relaxed',
        isAgent ? 'bg-[#D1FF00]/5' : 'bg-white/5',
        isNew && 'animate-[vt-fadeIn_300ms_ease-out_both]',
      )}
      style={{
        borderLeft: `2px solid ${isAgent ? '#D1FF00' : 'rgba(255,255,255,0.15)'}`,
      }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <span
          className={cn(
            'text-[10px] uppercase tracking-[0.08em] font-mono',
            isAgent ? 'text-[#D1FF00]/50' : 'text-white/30',
          )}
        >
          {isAgent ? 'AGENTE' : 'VOCE'}
        </span>
        {timestamp != null && (
          <span className="text-[10px] font-mono text-white/20 tabular-nums">
            {formatRelativeTime(timestamp)}
          </span>
        )}
      </div>
      <p className={cn('font-mono', isAgent ? 'text-[#D1FF00]/90' : 'text-white/70')}>
        {text}
      </p>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div
      className="relative pl-3 py-2 pr-3 bg-[#0099FF]/5 animate-[vt-fadeIn_300ms_ease-out_both]"
      style={{ borderLeft: '2px solid rgba(0,153,255,0.4)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.08em] font-mono text-[#0099FF]/50">
          AGENTE
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="inline-flex gap-[3px]">
          <span className="w-[5px] h-[5px] rounded-full bg-[#0099FF] animate-[vt-dot_1.4s_ease-in-out_infinite]" />
          <span className="w-[5px] h-[5px] rounded-full bg-[#0099FF] animate-[vt-dot_1.4s_ease-in-out_0.2s_infinite]" />
          <span className="w-[5px] h-[5px] rounded-full bg-[#0099FF] animate-[vt-dot_1.4s_ease-in-out_0.4s_infinite]" />
        </span>
        <span className="text-xs font-mono text-[#0099FF]/50">
          Processando resposta...
        </span>
      </div>
    </div>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = getText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [getText]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5',
        'text-[10px] font-mono uppercase tracking-[0.08em]',
        'bg-white/5 hover:bg-white/10 transition-colors',
        'text-white/30 hover:text-white/60',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D1FF00]/40',
      )}
      style={{ borderRadius: 0 }}
      aria-label="Copiar transcricao"
    >
      {copied ? (
        <span className="text-[#D1FF00]/80">Copiado!</span>
      ) : (
        <>
          {/* Copy icon (clipboard) */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          >
            <rect x="9" y="9" width="13" height="13" />
            <path d="M5 15H3V3h12v2" />
          </svg>
          <span>Copiar</span>
        </>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60px] px-4">
      <p className="text-xs font-mono text-white/20 text-center leading-relaxed">
        Pressione espaco ou segure o botao para falar
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

/**
 * VoiceTranscript -- Enhanced real-time transcript display.
 *
 * Features:
 * - Typewriter effect for agent speech
 * - Message bubbles with role-based styling
 * - Relative timestamps
 * - Copy-to-clipboard
 * - Smooth scroll, fade-in animations
 * - Thinking indicator with animated dots
 */
export function VoiceTranscript({
  userTranscript,
  agentTranscript,
  state,
  history,
}: VoiceTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Typewriter for agent text (only when speaking)
  const displayedAgentText = useTypewriter(
    agentTranscript,
    state === 'speaking',
    30,
  );

  // Auto-scroll to bottom on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [history.length, userTranscript, displayedAgentText, state]);

  // Build clipboard text
  const getClipboardText = useCallback(() => {
    const lines: string[] = [];

    for (const entry of history) {
      const label = entry.role === 'user' ? 'Voce' : 'Agente';
      lines.push(`[${label}] ${entry.text}`);
    }

    if (userTranscript) {
      lines.push(`[Voce] ${userTranscript}`);
    }
    if (agentTranscript) {
      lines.push(`[Agente] ${agentTranscript}`);
    }

    return lines.join('\n');
  }, [history, userTranscript, agentTranscript]);

  const hasContent =
    history.length > 0 ||
    userTranscript.length > 0 ||
    agentTranscript.length > 0 ||
    state === 'thinking';

  const showListeningBubble = state === 'listening' && userTranscript.length > 0;
  const showSpeakingBubble = state === 'speaking' && agentTranscript.length > 0;

  return (
    <div className="w-full max-w-lg flex flex-col items-stretch relative">
      {/* Copy button (only when there is content) */}
      {hasContent && <CopyButton getText={getClipboardText} />}

      {/* Scrollable transcript area */}
      <div
        ref={scrollRef}
        className={cn(
          'max-h-[240px] overflow-y-auto w-full',
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10',
        )}
        style={{ scrollBehavior: 'smooth' }}
      >
        {!hasContent ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-1.5 py-1">
            {/* History entries */}
            {history.map((entry, i) => (
              <MessageBubble
                key={`${entry.timestamp}-${i}`}
                role={entry.role}
                text={entry.text}
                timestamp={entry.timestamp}
              />
            ))}

            {/* Current user transcript (listening) */}
            {showListeningBubble && (
              <div
                className="relative pl-3 py-2 pr-3 bg-white/5 animate-[vt-fadeIn_300ms_ease-out_both]"
                style={{ borderLeft: '2px solid rgba(255,255,255,0.15)' }}
              >
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-[0.08em] font-mono text-white/30">
                    VOCE
                  </span>
                  <span className="text-[10px] font-mono text-white/20 tabular-nums">
                    agora
                  </span>
                </div>
                <p className="font-mono text-sm text-white/70 leading-relaxed">
                  {userTranscript}
                  <span className="inline-block w-[2px] h-[14px] bg-white/60 ml-0.5 align-middle animate-[vt-blink_1s_step-end_infinite]" />
                </p>
              </div>
            )}

            {/* Thinking indicator */}
            {state === 'thinking' && <ThinkingIndicator />}

            {/* Current agent transcript with typewriter (speaking) */}
            {showSpeakingBubble && (
              <div
                className="relative pl-3 py-2 pr-3 bg-[#D1FF00]/5 animate-[vt-fadeIn_300ms_ease-out_both]"
                style={{ borderLeft: '2px solid #D1FF00' }}
              >
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-[0.08em] font-mono text-[#D1FF00]/50">
                    AGENTE
                  </span>
                  <span className="text-[10px] font-mono text-white/20 tabular-nums">
                    agora
                  </span>
                </div>
                <p className="font-mono text-sm text-[#D1FF00]/90 leading-relaxed">
                  {displayedAgentText}
                  <span className="inline-block w-[2px] h-[14px] bg-[#D1FF00]/60 ml-0.5 align-middle animate-[vt-blink_1s_step-end_infinite]" />
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inject keyframes */}
      <style>{`
        @keyframes vt-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes vt-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes vt-fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default VoiceTranscript;
