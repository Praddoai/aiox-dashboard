import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useVoiceStore, type TTSProvider, type VoiceBackend } from '../../stores/voiceStore';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface VoiceSettingsProps {
  isOpen: boolean;
  language: string;
  selectedDeviceId: string | null;
  onLanguageChange: (lang: string) => void;
  onDeviceChange: (deviceId: string | null) => void;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'pt-BR', label: 'Portugues (BR)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'es-ES', label: 'Espanol' },
  { code: 'fr-FR', label: 'Francais' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'ja-JP', label: 'Japanese' },
];

const TTS_PROVIDERS: { id: TTSProvider; label: string; description: string }[] = [
  { id: 'edge', label: 'Edge TTS (Rapido)', description: 'Microsoft Neural — local, gratis, <1s' },
  { id: 'fal', label: 'fal.ai MiniMax (Voice Clone)', description: 'MiniMax Speech 2.8 HD — voz clonada' },
  { id: 'elevenlabs', label: 'ElevenLabs', description: 'Vozes neurais premium' },
  { id: 'openai', label: 'OpenAI TTS', description: 'Vozes HD naturais' },
  { id: 'browser', label: 'Browser (Nativo)', description: 'Web Speech API' },
];

const ELEVENLABS_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam — Profunda, autoritativa' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni — Clara, natural' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh — Ressonante, quente' },
  { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold — Forte, definida' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', label: 'Sam — Autoritativa, firme' },
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel — Feminina, suave' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella — Feminina, clara' },
];

const OPENAI_VOICES = [
  { id: 'onyx', label: 'Onyx — Profunda, poderosa' },
  { id: 'echo', label: 'Echo — Suave, fluida' },
  { id: 'alloy', label: 'Alloy — Neutra, equilibrada' },
  { id: 'fable', label: 'Fable — Expressiva, narrativa' },
  { id: 'nova', label: 'Nova — Quente, amigavel' },
  { id: 'shimmer', label: 'Shimmer — Clara, brilhante' },
];

const EDGE_VOICES = [
  { id: 'pt-BR-AntonioNeural', label: 'Antonio — Masculina, natural (pt-BR)' },
  { id: 'pt-BR-FranciscaNeural', label: 'Francisca — Feminina, natural (pt-BR)' },
  { id: 'pt-BR-ThalitaMultilingualNeural', label: 'Thalita — Feminina, multilingual (pt-BR)' },
];

const FAL_VOICES = [
  { id: 'Voicefd6cfcfe1772819947', label: 'Clone — Voz clonada (referencia)' },
  { id: 'Calm_Woman', label: 'Calm Woman — Feminina, serena' },
  { id: 'Deep_Voice_Man', label: 'Deep Voice Man — Masculina, grave' },
  { id: 'Friendly_Person', label: 'Friendly Person — Amigavel' },
  { id: 'Casual_Guy', label: 'Casual Guy — Masculina, casual' },
  { id: 'Patient_Man', label: 'Patient Man — Masculina, paciente' },
  { id: 'Elegant_Man', label: 'Elegant Man — Masculina, elegante' },
  { id: 'Determined_Man', label: 'Determined Man — Masculina, determinada' },
];

const VOICE_BACKENDS: { id: VoiceBackend; label: string; description: string }[] = [
  { id: 'multi-service', label: 'Multi-servico', description: 'STT + LLM + TTS separados (mais controle)' },
  { id: 'gemini-live', label: 'Gemini Live', description: 'Audio nativo — STT+LLM+TTS em 1 modelo (mais rapido)' },
];

const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore — Feminina, firme' },
  { id: 'Aoede', label: 'Aoede — Feminina, brilhante' },
  { id: 'Leda', label: 'Leda — Feminina, suave' },
  { id: 'Puck', label: 'Puck — Masculina, expressiva' },
  { id: 'Charon', label: 'Charon — Masculina, profunda' },
  { id: 'Fenrir', label: 'Fenrir — Masculina, grave' },
  { id: 'Orus', label: 'Orus — Masculina, equilibrada' },
  { id: 'Zephyr', label: 'Zephyr — Neutra, moderna' },
];

// --- Icons ---

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="9" y="1" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12h2l3-7 4 14 4-14 3 7h4" />
    </svg>
  );
}

// --- Dropdown ---

function Dropdown({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) || options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-none border text-sm font-mono transition-colors',
          'bg-white/5 border-white/10 text-white/70 hover:border-white/20',
        )}
      >
        {icon}
        <span className="flex-1 text-left text-xs truncate">{selected?.label ?? label}</span>
        <ChevronIcon className={cn('transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 border border-white/10 overflow-hidden max-h-52 overflow-y-auto z-30"
          style={{ background: 'rgba(10,10,10,0.98)' }}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs font-mono transition-colors',
                opt.id === value
                  ? 'bg-[#D1FF00]/10 text-[#D1FF00]'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80',
              )}
            >
              {opt.label}
              {opt.id === value && <span className="float-right text-[#D1FF00]">&#10003;</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function VoiceSettings({
  isOpen,
  language,
  selectedDeviceId,
  onLanguageChange,
  onDeviceChange,
  onClose,
}: VoiceSettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isDeviceOpen, setIsDeviceOpen] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);

  const {
    ttsProvider,
    ttsApiKey,
    ttsVoiceId,
    ttsEffectsEnabled,
    setTTSProvider,
    setTTSApiKey,
    setTTSVoiceId,
    setTTSEffectsEnabled,
    voiceBackend,
    geminiApiKey,
    geminiVoiceName,
    setVoiceBackend,
    setGeminiApiKey,
    setGeminiVoiceName,
  } = useVoiceStore();

  const isGeminiMode = voiceBackend === 'gemini-live';
  const isCloudProvider = ttsProvider !== 'browser' && ttsProvider !== 'edge';
  const showVoiceSelector = ttsProvider !== 'browser';
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Enumerate audio input devices
  useEffect(() => {
    if (!isOpen) return;
    async function loadDevices() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices
          .filter((d) => d.kind === 'audioinput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Microfone ${i + 1}`,
          }));
        setAudioDevices(inputs);
      } catch {
        setAudioDevices([]);
      }
    }
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const voiceOptions = ttsProvider === 'edge'
    ? EDGE_VOICES
    : ttsProvider === 'elevenlabs'
      ? ELEVENLABS_VOICES
      : ttsProvider === 'fal'
        ? FAL_VOICES
        : OPENAI_VOICES;
  const providerInfo = TTS_PROVIDERS.find((p) => p.id === ttsProvider)!;

  return (
    <div
      ref={panelRef}
      className="fixed top-0 right-0 bottom-0 z-[400] w-80 flex flex-col"
      style={{ animation: 'vs-slideIn 0.25s ease-out', background: 'rgba(8,8,8,0.98)', backdropFilter: 'blur(24px)' }}
    >
      <div
        className="flex flex-col flex-1 border-l border-white/10 overflow-y-auto"
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 z-10" style={{ background: 'rgba(8,8,8,0.98)' }}>
          <span className="text-[10px] uppercase tracking-[0.12em] font-mono text-white/50">
            CONFIGURACOES DE VOZ
          </span>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
            aria-label="Fechar configuracoes"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* --- VOICE BACKEND --- */}
        <div className="px-4 py-3">
          <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block mb-2">
            MODO DE VOZ
          </label>
          <Dropdown
            label="Backend"
            icon={<WaveIcon />}
            value={voiceBackend}
            options={VOICE_BACKENDS.map((b) => ({ id: b.id, label: b.label }))}
            onChange={(id) => setVoiceBackend(id as VoiceBackend)}
          />
          <p className="mt-1.5 text-[8px] font-mono text-white/20">
            {VOICE_BACKENDS.find((b) => b.id === voiceBackend)?.description}
          </p>
        </div>

        {/* --- GEMINI LIVE CONFIG --- */}
        {isGeminiMode && (
          <>
            <div className="px-4 py-3 border-t border-white/5">
              <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block mb-2">
                API KEY — GOOGLE GEMINI
              </label>
              <div className="flex items-center gap-1">
                <KeyIcon />
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="flex-1 bg-white/5 border border-white/10 px-3 py-2 rounded-none text-xs font-mono text-white/70 placeholder-white/20 focus:border-[#00C8FF]/30 focus:outline-none transition-colors"
                  autoComplete="off"
                />
                <button
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="px-2 py-2 text-white/30 hover:text-white/60 transition-colors text-[9px] font-mono uppercase"
                  type="button"
                >
                  {showGeminiKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {!geminiApiKey && (
                <p className="mt-1.5 text-[8px] font-mono text-amber-500/60">
                  Obtenha em aistudio.google.com &rarr; API Keys
                </p>
              )}
            </div>

            <div className="px-4 py-3 border-t border-white/5">
              <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block mb-2">
                VOZ GEMINI
              </label>
              <Dropdown
                label="Selecionar voz"
                icon={<WaveIcon />}
                value={geminiVoiceName}
                options={GEMINI_VOICES}
                onChange={setGeminiVoiceName}
              />
            </div>

            {/* Jarvis effects toggle */}
            <div className="px-4 py-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block">
                    EFEITO JARVIS
                  </label>
                  <p className="text-[8px] font-mono text-white/15 mt-0.5">
                    Warmth + presenca + micro-reverb
                  </p>
                </div>
                <button
                  onClick={() => setTTSEffectsEnabled(!ttsEffectsEnabled)}
                  className={cn(
                    'relative w-10 h-5 rounded-full transition-colors',
                    ttsEffectsEnabled ? 'bg-[#00C8FF]/30' : 'bg-white/10',
                  )}
                  role="switch"
                  aria-checked={ttsEffectsEnabled}
                  aria-label="Efeito Jarvis de audio"
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                      ttsEffectsEnabled
                        ? 'left-[22px] bg-[#00C8FF]'
                        : 'left-0.5 bg-white/40',
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-white/5">
              <div className="flex gap-2 items-start">
                <span className="text-[#00C8FF]/70 mt-0.5 flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
                <p className="text-[8px] font-mono text-[#00C8FF]/40 leading-relaxed">
                  Gemini Live usa <strong className="text-[#00C8FF]/60">audio nativo</strong> — sem STT/TTS separados.
                  O microfone fica sempre ativo apos conectar. Latencia minima.
                </p>
              </div>
            </div>
          </>
        )}

        {/* --- TTS PROVIDER (multi-service only) --- */}
        {!isGeminiMode && (<>
        <div className="px-4 py-3 border-t border-white/5">
          <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block mb-2">
            MOTOR DE VOZ (TTS)
          </label>
          <Dropdown
            label="Provider"
            icon={<SpeakerIcon />}
            value={ttsProvider}
            options={TTS_PROVIDERS.map((p) => ({ id: p.id, label: p.label }))}
            onChange={(id) => {
              setTTSProvider(id as TTSProvider);
              // Set sensible default voice when switching providers
              if (id === 'edge') setTTSVoiceId('pt-BR-AntonioNeural');
              else if (id === 'fal') setTTSVoiceId('Voicefd6cfcfe1772819947');
              else if (id === 'elevenlabs') setTTSVoiceId('pNInz6obpgDQGcFmaJgB');
              else if (id === 'openai') setTTSVoiceId('onyx');
              else setTTSVoiceId('');
            }}
          />
        </div>

        {/* --- API KEY (cloud only) --- */}
        {isCloudProvider && (
          <div className="px-4 py-3 border-t border-white/5">
            <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block mb-2">
              API KEY — {ttsProvider === 'elevenlabs' ? 'ELEVENLABS' : ttsProvider === 'fal' ? 'FAL.AI' : 'OPENAI'}
            </label>
            <div className="relative">
              <div className="flex items-center gap-1">
                <KeyIcon />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={ttsApiKey}
                  onChange={(e) => setTTSApiKey(e.target.value)}
                  placeholder={ttsProvider === 'elevenlabs' ? 'xi-...' : ttsProvider === 'fal' ? 'fal_...' : 'sk-...'}
                  className="flex-1 bg-white/5 border border-white/10 px-3 py-2 rounded-none text-xs font-mono text-white/70 placeholder-white/20 focus:border-[#D1FF00]/30 focus:outline-none transition-colors"
                  autoComplete="off"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-2 py-2 text-white/30 hover:text-white/60 transition-colors text-[9px] font-mono uppercase"
                  type="button"
                >
                  {showApiKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {!ttsApiKey && (
                <p className="mt-1.5 text-[8px] font-mono text-amber-500/60">
                  {ttsProvider === 'elevenlabs'
                    ? 'Obtenha em elevenlabs.io → Profile → API Key'
                    : ttsProvider === 'fal'
                      ? 'Obtenha em fal.ai → Dashboard → Keys'
                      : 'Obtenha em platform.openai.com → API Keys'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* --- VOICE SELECTION --- */}
        {showVoiceSelector && (
          <div className="px-4 py-3 border-t border-white/5">
            <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block mb-2">
              VOZ
            </label>
            <Dropdown
              label="Selecionar voz"
              icon={<WaveIcon />}
              value={ttsVoiceId}
              options={voiceOptions}
              onChange={setTTSVoiceId}
            />
          </div>
        )}

        {/* --- EFFECTS TOGGLE --- */}
        {showVoiceSelector && (
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block">
                  EFEITO JARVIS
                </label>
                <p className="text-[8px] font-mono text-white/15 mt-0.5">
                  Warmth + presenca + micro-reverb
                </p>
              </div>
              <button
                onClick={() => setTTSEffectsEnabled(!ttsEffectsEnabled)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors',
                  ttsEffectsEnabled ? 'bg-[#D1FF00]/30' : 'bg-white/10',
                )}
                role="switch"
                aria-checked={ttsEffectsEnabled}
                aria-label="Efeito Jarvis de audio"
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                    ttsEffectsEnabled
                      ? 'left-[22px] bg-[#D1FF00]'
                      : 'left-0.5 bg-white/40',
                  )}
                />
              </button>
            </div>
          </div>
        )}

        {/* --- Browser provider notice --- */}
        {!isCloudProvider && (
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex gap-2 items-start">
              <span className="text-amber-500/70 mt-0.5 flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <p className="text-[8px] font-mono text-amber-500/50 leading-relaxed">
                A voz nativa do browser e limitada. Para qualidade JARVIS,
                selecione <strong className="text-amber-500/70">ElevenLabs</strong> ou <strong className="text-amber-500/70">OpenAI</strong> como motor.
              </p>
            </div>
          </div>
        )}
        </>)}

        {/* --- LANGUAGE --- */}
        <div className="px-4 py-3 border-t border-white/5">
          <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block mb-2">
            IDIOMA DE RECONHECIMENTO
          </label>
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-none border text-sm font-mono transition-colors',
                'bg-white/5 border-white/10 text-white/70 hover:border-white/20',
              )}
            >
              <GlobeIcon />
              <span className="flex-1 text-left text-xs">{selectedLang.label}</span>
              <ChevronIcon className={cn('transition-transform', isLangOpen && 'rotate-180')} />
            </button>

            {isLangOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-1 border border-white/10 overflow-hidden z-30"
                style={{ background: 'rgba(10,10,10,0.98)' }}
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang.code);
                      setIsLangOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs font-mono transition-colors',
                      lang.code === language
                        ? 'bg-[#D1FF00]/10 text-[#D1FF00]'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/80',
                    )}
                  >
                    {lang.label}
                    {lang.code === language && (
                      <span className="float-right text-[#D1FF00]">&#10003;</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- AUDIO DEVICE --- */}
        <div className="px-4 py-3 border-t border-white/5">
          <label className="text-[9px] uppercase tracking-[0.12em] font-mono text-white/30 block mb-2">
            DISPOSITIVO DE AUDIO
          </label>
          <div className="relative">
            <button
              onClick={() => setIsDeviceOpen(!isDeviceOpen)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-none border text-sm font-mono transition-colors',
                'bg-white/5 border-white/10 text-white/70 hover:border-white/20',
              )}
            >
              <MicIcon />
              <span className="flex-1 text-left text-xs truncate">
                {selectedDeviceId
                  ? (audioDevices.find((d) => d.deviceId === selectedDeviceId)?.label || 'Dispositivo selecionado')
                  : 'Padrao do sistema'}
              </span>
              <ChevronIcon className={cn('transition-transform flex-shrink-0', isDeviceOpen && 'rotate-180')} />
            </button>

            {isDeviceOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-1 border border-white/10 overflow-hidden max-h-48 overflow-y-auto z-30"
                style={{ background: 'rgba(10,10,10,0.98)' }}
              >
                <button
                  onClick={() => { onDeviceChange(null); setIsDeviceOpen(false); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs font-mono transition-colors',
                    !selectedDeviceId
                      ? 'bg-[#D1FF00]/10 text-[#D1FF00]'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/80',
                  )}
                >
                  Padrao do sistema
                  {!selectedDeviceId && <span className="float-right text-[#D1FF00]">&#10003;</span>}
                </button>
                {audioDevices.map((device) => (
                  <button
                    key={device.deviceId}
                    onClick={() => { onDeviceChange(device.deviceId); setIsDeviceOpen(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs font-mono transition-colors',
                      device.deviceId === selectedDeviceId
                        ? 'bg-[#D1FF00]/10 text-[#D1FF00]'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/80',
                    )}
                  >
                    {device.label}
                    {device.deviceId === selectedDeviceId && (
                      <span className="float-right text-[#D1FF00]">&#10003;</span>
                    )}
                  </button>
                ))}
                {audioDevices.length === 0 && (
                  <div className="px-3 py-2 text-xs font-mono text-white/30">
                    Nenhum dispositivo encontrado
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Info footer --- */}
        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-[9px] font-mono text-white/20 leading-relaxed">
            {isGeminiMode ? (
              <>
                MODO: GEMINI LIVE (NATIVE AUDIO)
                <br />
                VOZ: {geminiVoiceName.toUpperCase()}
                {ttsEffectsEnabled && (
                  <>
                    <br />
                    FX: WARMTH + PRESENCE + MICRO-REVERB
                  </>
                )}
                <br />
                PIPELINE: AUDIO IN → GEMINI → {ttsEffectsEnabled ? 'JARVIS FX → ' : ''}AUDIO OUT
              </>
            ) : (
              <>
                TTS: {providerInfo.description.toUpperCase()}
                <br />
                STT: WEB SPEECH API (NATIVO)
                {showVoiceSelector && ttsEffectsEnabled && (
                  <>
                    <br />
                    FX: WARMTH + PRESENCE + MICRO-REVERB
                  </>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes vs-slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default VoiceSettings;
