import { create } from 'zustand';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing';
export type TTSProvider = 'browser' | 'elevenlabs' | 'openai' | 'fal' | 'edge';
export type VoiceBackend = 'multi-service' | 'gemini-live';

interface TranscriptEntry {
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

interface TTSConfig {
  ttsProvider: TTSProvider;
  ttsApiKey: string;
  ttsVoiceId: string;
  ttsEffectsEnabled: boolean;
}

interface VoiceConfig {
  voiceBackend: VoiceBackend;
  geminiApiKey: string;
  geminiVoiceName: string;
}

const TTS_CONFIG_KEY = 'aios-tts-config';
const VOICE_CONFIG_KEY = 'aios-voice-config';

function loadTTSConfig(): TTSConfig {
  try {
    const stored = localStorage.getItem(TTS_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    ttsProvider: 'browser',
    ttsApiKey: '',
    ttsVoiceId: '',
    ttsEffectsEnabled: true,
  };
}

function saveTTSConfig(config: TTSConfig) {
  try {
    localStorage.setItem(TTS_CONFIG_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

function loadVoiceConfig(): VoiceConfig {
  try {
    const stored = localStorage.getItem(VOICE_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    voiceBackend: 'multi-service',
    geminiApiKey: '',
    geminiVoiceName: 'Kore',
  };
}

function saveVoiceConfig(config: VoiceConfig) {
  try {
    localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

const savedTTS = loadTTSConfig();
const savedVoice = loadVoiceConfig();

interface VoiceStoreState {
  // Core state
  isActive: boolean;
  state: VoiceState;
  userTranscript: string;
  agentTranscript: string;
  inputLevel: number;
  outputLevel: number;
  language: string;
  error: string | null;

  // Extended state
  isMuted: boolean;
  showSettings: boolean;
  selectedDeviceId: string | null;
  conversationHistory: TranscriptEntry[];

  // TTS config (persisted to localStorage)
  ttsProvider: TTSProvider;
  ttsApiKey: string;
  ttsVoiceId: string;
  ttsEffectsEnabled: boolean;

  // Voice backend config (persisted)
  voiceBackend: VoiceBackend;
  geminiApiKey: string;
  geminiVoiceName: string;
}

interface VoiceStoreActions {
  // Core actions
  activate: () => void;
  deactivate: () => void;
  setState: (state: VoiceState) => void;
  setUserTranscript: (text: string) => void;
  setAgentTranscript: (text: string) => void;
  setInputLevel: (level: number) => void;
  setOutputLevel: (level: number) => void;
  setError: (error: string | null) => void;
  setLanguage: (lang: string) => void;

  // Extended actions
  toggleMute: () => void;
  toggleSettings: () => void;
  setSelectedDeviceId: (id: string | null) => void;
  addToHistory: (entry: Omit<TranscriptEntry, 'timestamp'>) => void;
  clearHistory: () => void;

  // TTS actions
  setTTSProvider: (provider: TTSProvider) => void;
  setTTSApiKey: (key: string) => void;
  setTTSVoiceId: (id: string) => void;
  setTTSEffectsEnabled: (enabled: boolean) => void;

  // Voice backend actions
  setVoiceBackend: (backend: VoiceBackend) => void;
  setGeminiApiKey: (key: string) => void;
  setGeminiVoiceName: (name: string) => void;
}

const ephemeralDefaults = {
  isActive: false,
  state: 'idle' as VoiceState,
  userTranscript: '',
  agentTranscript: '',
  inputLevel: 0,
  outputLevel: 0,
  language: 'pt-BR',
  error: null as string | null,
  isMuted: false,
  showSettings: false,
  selectedDeviceId: null as string | null,
  conversationHistory: [] as TranscriptEntry[],
};

export type { TranscriptEntry, VoiceConfig };

export const useVoiceStore = create<VoiceStoreState & VoiceStoreActions>()(
  (set, get) => ({
    ...ephemeralDefaults,
    ...savedTTS,
    ...savedVoice,

    activate: () => set({ isActive: true, state: 'idle', error: null }),

    deactivate: () => set({ ...ephemeralDefaults }),

    setState: (state) => set({ state }),

    setUserTranscript: (text) => set({ userTranscript: text }),

    setAgentTranscript: (text) => set({ agentTranscript: text }),

    setInputLevel: (level) => set({ inputLevel: Math.max(0, Math.min(1, level)) }),

    setOutputLevel: (level) => set({ outputLevel: Math.max(0, Math.min(1, level)) }),

    setError: (error) => set({ error }),

    setLanguage: (lang) => set({ language: lang }),

    toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

    toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),

    setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),

    addToHistory: (entry) =>
      set((s) => ({
        conversationHistory: [
          ...s.conversationHistory,
          { ...entry, timestamp: Date.now() },
        ],
      })),

    clearHistory: () => set({ conversationHistory: [] }),

    setTTSProvider: (provider) => {
      set({ ttsProvider: provider });
      const s = get();
      saveTTSConfig({ ttsProvider: provider, ttsApiKey: s.ttsApiKey, ttsVoiceId: s.ttsVoiceId, ttsEffectsEnabled: s.ttsEffectsEnabled });
    },

    setTTSApiKey: (key) => {
      set({ ttsApiKey: key });
      const s = get();
      saveTTSConfig({ ttsProvider: s.ttsProvider, ttsApiKey: key, ttsVoiceId: s.ttsVoiceId, ttsEffectsEnabled: s.ttsEffectsEnabled });
    },

    setTTSVoiceId: (id) => {
      set({ ttsVoiceId: id });
      const s = get();
      saveTTSConfig({ ttsProvider: s.ttsProvider, ttsApiKey: s.ttsApiKey, ttsVoiceId: id, ttsEffectsEnabled: s.ttsEffectsEnabled });
    },

    setTTSEffectsEnabled: (enabled) => {
      set({ ttsEffectsEnabled: enabled });
      const s = get();
      saveTTSConfig({ ttsProvider: s.ttsProvider, ttsApiKey: s.ttsApiKey, ttsVoiceId: s.ttsVoiceId, ttsEffectsEnabled: enabled });
    },

    setVoiceBackend: (backend) => {
      set({ voiceBackend: backend });
      const s = get();
      saveVoiceConfig({ voiceBackend: backend, geminiApiKey: s.geminiApiKey, geminiVoiceName: s.geminiVoiceName });
    },

    setGeminiApiKey: (key) => {
      set({ geminiApiKey: key });
      const s = get();
      saveVoiceConfig({ voiceBackend: s.voiceBackend, geminiApiKey: key, geminiVoiceName: s.geminiVoiceName });
    },

    setGeminiVoiceName: (name) => {
      set({ geminiVoiceName: name });
      const s = get();
      saveVoiceConfig({ voiceBackend: s.voiceBackend, geminiApiKey: s.geminiApiKey, geminiVoiceName: name });
    },
  })
);
