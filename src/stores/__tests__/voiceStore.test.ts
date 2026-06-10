import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
});

import { useVoiceStore } from '../voiceStore';
import type { VoiceState, TTSProvider, VoiceBackend } from '../voiceStore';

function resetStore() {
  mockStorage.clear();
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockClear();
  (localStorage.setItem as ReturnType<typeof vi.fn>).mockClear();
  useVoiceStore.setState({
    isActive: false,
    state: 'idle',
    userTranscript: '',
    agentTranscript: '',
    inputLevel: 0,
    outputLevel: 0,
    language: 'pt-BR',
    error: null,
    isMuted: false,
    showSettings: false,
    selectedDeviceId: null,
    conversationHistory: [],
    ttsProvider: 'browser',
    ttsApiKey: '',
    ttsVoiceId: '',
    ttsEffectsEnabled: true,
    voiceBackend: 'multi-service',
    geminiApiKey: '',
    geminiVoiceName: 'Kore',
  });
}

describe('voiceStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ─── Initial Defaults ────────────────────────────────────────────────

  describe('initial defaults', () => {
    it('should have correct ephemeral defaults', () => {
      const state = useVoiceStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.state).toBe('idle');
      expect(state.language).toBe('pt-BR');
      expect(state.userTranscript).toBe('');
      expect(state.agentTranscript).toBe('');
      expect(state.inputLevel).toBe(0);
      expect(state.outputLevel).toBe(0);
      expect(state.error).toBeNull();
      expect(state.isMuted).toBe(false);
      expect(state.showSettings).toBe(false);
      expect(state.selectedDeviceId).toBeNull();
      expect(state.conversationHistory).toEqual([]);
    });

    it('should have correct TTS config defaults', () => {
      const state = useVoiceStore.getState();
      expect(state.ttsProvider).toBe('browser');
      expect(state.ttsApiKey).toBe('');
      expect(state.ttsVoiceId).toBe('');
      expect(state.ttsEffectsEnabled).toBe(true);
    });

    it('should have correct voice config defaults', () => {
      const state = useVoiceStore.getState();
      expect(state.voiceBackend).toBe('multi-service');
      expect(state.geminiApiKey).toBe('');
      expect(state.geminiVoiceName).toBe('Kore');
    });
  });

  // ─── Core Actions ────────────────────────────────────────────────────

  describe('activate', () => {
    it('should set isActive true, state idle, and clear error', () => {
      useVoiceStore.setState({ error: 'some error' });
      useVoiceStore.getState().activate();

      const state = useVoiceStore.getState();
      expect(state.isActive).toBe(true);
      expect(state.state).toBe('idle');
      expect(state.error).toBeNull();
    });

    it('should be idempotent when called multiple times', () => {
      useVoiceStore.getState().activate();
      useVoiceStore.getState().activate();

      const state = useVoiceStore.getState();
      expect(state.isActive).toBe(true);
      expect(state.state).toBe('idle');
    });
  });

  describe('deactivate', () => {
    it('should reset all ephemeral state to defaults', () => {
      useVoiceStore.getState().activate();
      useVoiceStore.getState().setState('listening');
      useVoiceStore.getState().setUserTranscript('hello');
      useVoiceStore.getState().setAgentTranscript('response');
      useVoiceStore.getState().setInputLevel(0.8);
      useVoiceStore.getState().setOutputLevel(0.6);
      useVoiceStore.getState().setLanguage('en-US');
      useVoiceStore.getState().setError('test error');
      useVoiceStore.getState().toggleMute();
      useVoiceStore.getState().toggleSettings();
      useVoiceStore.getState().setSelectedDeviceId('device-123');
      useVoiceStore.getState().addToHistory({ role: 'user', text: 'hi' });

      useVoiceStore.getState().deactivate();

      const state = useVoiceStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.state).toBe('idle');
      expect(state.userTranscript).toBe('');
      expect(state.agentTranscript).toBe('');
      expect(state.inputLevel).toBe(0);
      expect(state.outputLevel).toBe(0);
      expect(state.language).toBe('pt-BR');
      expect(state.error).toBeNull();
      expect(state.isMuted).toBe(false);
      expect(state.showSettings).toBe(false);
      expect(state.selectedDeviceId).toBeNull();
      expect(state.conversationHistory).toEqual([]);
    });

    it('should not reset persisted TTS config', () => {
      useVoiceStore.getState().setTTSProvider('elevenlabs');
      useVoiceStore.getState().setTTSApiKey('my-key');
      useVoiceStore.getState().setTTSVoiceId('voice-1');
      useVoiceStore.getState().setTTSEffectsEnabled(false);

      useVoiceStore.getState().deactivate();

      // deactivate uses ephemeralDefaults which does NOT include TTS fields,
      // but Zustand's set is a shallow merge, so persisted fields remain
      // unless ephemeralDefaults explicitly overwrites them.
      // Looking at the store: deactivate spreads ephemeralDefaults which
      // does not include ttsProvider etc., so they are NOT reset by set().
      // However, set() with replace:false is a merge, so TTS fields survive.
      const state = useVoiceStore.getState();
      expect(state.ttsProvider).toBe('elevenlabs');
      expect(state.ttsApiKey).toBe('my-key');
      expect(state.ttsVoiceId).toBe('voice-1');
      expect(state.ttsEffectsEnabled).toBe(false);
    });

    it('should not reset persisted voice config', () => {
      useVoiceStore.getState().setVoiceBackend('gemini-live');
      useVoiceStore.getState().setGeminiApiKey('gemini-key');
      useVoiceStore.getState().setGeminiVoiceName('Puck');

      useVoiceStore.getState().deactivate();

      const state = useVoiceStore.getState();
      expect(state.voiceBackend).toBe('gemini-live');
      expect(state.geminiApiKey).toBe('gemini-key');
      expect(state.geminiVoiceName).toBe('Puck');
    });
  });

  describe('setState', () => {
    it('should update voice state', () => {
      useVoiceStore.getState().setState('listening');
      expect(useVoiceStore.getState().state).toBe('listening');

      useVoiceStore.getState().setState('speaking');
      expect(useVoiceStore.getState().state).toBe('speaking');
    });

    it('should cycle through all voice states', () => {
      const states: VoiceState[] = ['idle', 'listening', 'thinking', 'speaking', 'executing'];
      for (const voiceState of states) {
        useVoiceStore.getState().setState(voiceState);
        expect(useVoiceStore.getState().state).toBe(voiceState);
      }
    });
  });

  describe('setUserTranscript', () => {
    it('should update user transcript', () => {
      useVoiceStore.getState().setUserTranscript('Hello world');
      expect(useVoiceStore.getState().userTranscript).toBe('Hello world');
    });

    it('should handle empty string', () => {
      useVoiceStore.getState().setUserTranscript('something');
      useVoiceStore.getState().setUserTranscript('');
      expect(useVoiceStore.getState().userTranscript).toBe('');
    });
  });

  describe('setAgentTranscript', () => {
    it('should update agent transcript', () => {
      useVoiceStore.getState().setAgentTranscript('I can help with that');
      expect(useVoiceStore.getState().agentTranscript).toBe('I can help with that');
    });

    it('should handle empty string', () => {
      useVoiceStore.getState().setAgentTranscript('response');
      useVoiceStore.getState().setAgentTranscript('');
      expect(useVoiceStore.getState().agentTranscript).toBe('');
    });
  });

  // ─── Level Clamping ──────────────────────────────────────────────────

  describe('setInputLevel', () => {
    it('should accept values within range', () => {
      useVoiceStore.getState().setInputLevel(0.5);
      expect(useVoiceStore.getState().inputLevel).toBe(0.5);
    });

    it('should clamp negative values to 0', () => {
      useVoiceStore.getState().setInputLevel(-0.5);
      expect(useVoiceStore.getState().inputLevel).toBe(0);
    });

    it('should clamp large negative values to 0', () => {
      useVoiceStore.getState().setInputLevel(-100);
      expect(useVoiceStore.getState().inputLevel).toBe(0);
    });

    it('should clamp values above 1 to 1', () => {
      useVoiceStore.getState().setInputLevel(1.5);
      expect(useVoiceStore.getState().inputLevel).toBe(1);
    });

    it('should clamp large positive values to 1', () => {
      useVoiceStore.getState().setInputLevel(999);
      expect(useVoiceStore.getState().inputLevel).toBe(1);
    });

    it('should accept exact boundary value 0', () => {
      useVoiceStore.getState().setInputLevel(0.5);
      useVoiceStore.getState().setInputLevel(0);
      expect(useVoiceStore.getState().inputLevel).toBe(0);
    });

    it('should accept exact boundary value 1', () => {
      useVoiceStore.getState().setInputLevel(1);
      expect(useVoiceStore.getState().inputLevel).toBe(1);
    });
  });

  describe('setOutputLevel', () => {
    it('should accept values within range', () => {
      useVoiceStore.getState().setOutputLevel(0.7);
      expect(useVoiceStore.getState().outputLevel).toBe(0.7);
    });

    it('should clamp negative values to 0', () => {
      useVoiceStore.getState().setOutputLevel(-1);
      expect(useVoiceStore.getState().outputLevel).toBe(0);
    });

    it('should clamp large negative values to 0', () => {
      useVoiceStore.getState().setOutputLevel(-50);
      expect(useVoiceStore.getState().outputLevel).toBe(0);
    });

    it('should clamp values above 1 to 1', () => {
      useVoiceStore.getState().setOutputLevel(2);
      expect(useVoiceStore.getState().outputLevel).toBe(1);
    });

    it('should clamp large positive values to 1', () => {
      useVoiceStore.getState().setOutputLevel(500);
      expect(useVoiceStore.getState().outputLevel).toBe(1);
    });

    it('should accept exact boundary value 0', () => {
      useVoiceStore.getState().setOutputLevel(0.5);
      useVoiceStore.getState().setOutputLevel(0);
      expect(useVoiceStore.getState().outputLevel).toBe(0);
    });

    it('should accept exact boundary value 1', () => {
      useVoiceStore.getState().setOutputLevel(1);
      expect(useVoiceStore.getState().outputLevel).toBe(1);
    });
  });

  // ─── Error and Language ──────────────────────────────────────────────

  describe('setError', () => {
    it('should set an error message', () => {
      useVoiceStore.getState().setError('Microphone not found');
      expect(useVoiceStore.getState().error).toBe('Microphone not found');
    });

    it('should clear error with null', () => {
      useVoiceStore.getState().setError('some error');
      useVoiceStore.getState().setError(null);
      expect(useVoiceStore.getState().error).toBeNull();
    });

    it('should overwrite existing error', () => {
      useVoiceStore.getState().setError('error 1');
      useVoiceStore.getState().setError('error 2');
      expect(useVoiceStore.getState().error).toBe('error 2');
    });
  });

  describe('setLanguage', () => {
    it('should update language', () => {
      useVoiceStore.getState().setLanguage('en-US');
      expect(useVoiceStore.getState().language).toBe('en-US');
    });

    it('should accept any language string', () => {
      useVoiceStore.getState().setLanguage('ja-JP');
      expect(useVoiceStore.getState().language).toBe('ja-JP');
    });
  });

  // ─── Toggle Actions ──────────────────────────────────────────────────

  describe('toggleMute', () => {
    it('should toggle from false to true', () => {
      expect(useVoiceStore.getState().isMuted).toBe(false);
      useVoiceStore.getState().toggleMute();
      expect(useVoiceStore.getState().isMuted).toBe(true);
    });

    it('should toggle from true to false', () => {
      useVoiceStore.getState().toggleMute();
      useVoiceStore.getState().toggleMute();
      expect(useVoiceStore.getState().isMuted).toBe(false);
    });

    it('should toggle correctly across multiple invocations', () => {
      for (let i = 0; i < 5; i++) {
        useVoiceStore.getState().toggleMute();
      }
      // 5 toggles from false => true
      expect(useVoiceStore.getState().isMuted).toBe(true);
    });
  });

  describe('toggleSettings', () => {
    it('should toggle from false to true', () => {
      expect(useVoiceStore.getState().showSettings).toBe(false);
      useVoiceStore.getState().toggleSettings();
      expect(useVoiceStore.getState().showSettings).toBe(true);
    });

    it('should toggle from true to false', () => {
      useVoiceStore.getState().toggleSettings();
      useVoiceStore.getState().toggleSettings();
      expect(useVoiceStore.getState().showSettings).toBe(false);
    });
  });

  // ─── Extended Actions ────────────────────────────────────────────────

  describe('setSelectedDeviceId', () => {
    it('should set a device id', () => {
      useVoiceStore.getState().setSelectedDeviceId('device-abc');
      expect(useVoiceStore.getState().selectedDeviceId).toBe('device-abc');
    });

    it('should clear device id with null', () => {
      useVoiceStore.getState().setSelectedDeviceId('device-abc');
      useVoiceStore.getState().setSelectedDeviceId(null);
      expect(useVoiceStore.getState().selectedDeviceId).toBeNull();
    });
  });

  describe('addToHistory', () => {
    it('should add a user entry with timestamp', () => {
      const before = Date.now();
      useVoiceStore.getState().addToHistory({ role: 'user', text: 'Hello' });
      const after = Date.now();

      const history = useVoiceStore.getState().conversationHistory;
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('user');
      expect(history[0].text).toBe('Hello');
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should add an agent entry with timestamp', () => {
      useVoiceStore.getState().addToHistory({ role: 'agent', text: 'Hi there' });
      const history = useVoiceStore.getState().conversationHistory;
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('agent');
      expect(history[0].text).toBe('Hi there');
    });

    it('should append multiple entries in order', () => {
      useVoiceStore.getState().addToHistory({ role: 'user', text: 'First' });
      useVoiceStore.getState().addToHistory({ role: 'agent', text: 'Second' });
      useVoiceStore.getState().addToHistory({ role: 'user', text: 'Third' });

      const history = useVoiceStore.getState().conversationHistory;
      expect(history).toHaveLength(3);
      expect(history[0].text).toBe('First');
      expect(history[1].text).toBe('Second');
      expect(history[2].text).toBe('Third');
    });

    it('should assign unique timestamps (non-decreasing)', () => {
      useVoiceStore.getState().addToHistory({ role: 'user', text: 'A' });
      useVoiceStore.getState().addToHistory({ role: 'agent', text: 'B' });

      const history = useVoiceStore.getState().conversationHistory;
      expect(history[1].timestamp).toBeGreaterThanOrEqual(history[0].timestamp);
    });
  });

  describe('clearHistory', () => {
    it('should empty conversation history', () => {
      useVoiceStore.getState().addToHistory({ role: 'user', text: 'Hello' });
      useVoiceStore.getState().addToHistory({ role: 'agent', text: 'Hi' });
      expect(useVoiceStore.getState().conversationHistory).toHaveLength(2);

      useVoiceStore.getState().clearHistory();
      expect(useVoiceStore.getState().conversationHistory).toEqual([]);
    });

    it('should be safe to call on empty history', () => {
      useVoiceStore.getState().clearHistory();
      expect(useVoiceStore.getState().conversationHistory).toEqual([]);
    });
  });

  // ─── TTS Config Persistence ──────────────────────────────────────────

  describe('setTTSProvider', () => {
    it('should update ttsProvider in state', () => {
      useVoiceStore.getState().setTTSProvider('elevenlabs');
      expect(useVoiceStore.getState().ttsProvider).toBe('elevenlabs');
    });

    it('should persist to localStorage', () => {
      useVoiceStore.getState().setTTSProvider('openai');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'aios-tts-config',
        expect.any(String),
      );
      const stored = JSON.parse(mockStorage.get('aios-tts-config')!);
      expect(stored.ttsProvider).toBe('openai');
    });

    it('should persist all TTS fields together', () => {
      useVoiceStore.getState().setTTSApiKey('key-123');
      useVoiceStore.getState().setTTSVoiceId('voice-456');
      useVoiceStore.getState().setTTSEffectsEnabled(false);
      useVoiceStore.getState().setTTSProvider('fal');

      const stored = JSON.parse(mockStorage.get('aios-tts-config')!);
      expect(stored.ttsProvider).toBe('fal');
      expect(stored.ttsApiKey).toBe('key-123');
      expect(stored.ttsVoiceId).toBe('voice-456');
      expect(stored.ttsEffectsEnabled).toBe(false);
    });

    it('should accept all valid TTS providers', () => {
      const providers: TTSProvider[] = ['browser', 'elevenlabs', 'openai', 'fal', 'edge'];
      for (const provider of providers) {
        useVoiceStore.getState().setTTSProvider(provider);
        expect(useVoiceStore.getState().ttsProvider).toBe(provider);
      }
    });
  });

  describe('setTTSApiKey', () => {
    it('should update ttsApiKey in state', () => {
      useVoiceStore.getState().setTTSApiKey('my-api-key');
      expect(useVoiceStore.getState().ttsApiKey).toBe('my-api-key');
    });

    it('should persist to localStorage with full TTS config', () => {
      useVoiceStore.getState().setTTSProvider('elevenlabs');
      useVoiceStore.getState().setTTSApiKey('secret-key');

      const stored = JSON.parse(mockStorage.get('aios-tts-config')!);
      expect(stored.ttsApiKey).toBe('secret-key');
      expect(stored.ttsProvider).toBe('elevenlabs');
    });
  });

  describe('setTTSVoiceId', () => {
    it('should update ttsVoiceId in state', () => {
      useVoiceStore.getState().setTTSVoiceId('voice-xyz');
      expect(useVoiceStore.getState().ttsVoiceId).toBe('voice-xyz');
    });

    it('should persist to localStorage', () => {
      useVoiceStore.getState().setTTSVoiceId('voice-abc');

      const stored = JSON.parse(mockStorage.get('aios-tts-config')!);
      expect(stored.ttsVoiceId).toBe('voice-abc');
    });
  });

  describe('setTTSEffectsEnabled', () => {
    it('should set effects enabled to false', () => {
      useVoiceStore.getState().setTTSEffectsEnabled(false);
      expect(useVoiceStore.getState().ttsEffectsEnabled).toBe(false);
    });

    it('should set effects enabled to true', () => {
      useVoiceStore.getState().setTTSEffectsEnabled(false);
      useVoiceStore.getState().setTTSEffectsEnabled(true);
      expect(useVoiceStore.getState().ttsEffectsEnabled).toBe(true);
    });

    it('should persist to localStorage', () => {
      useVoiceStore.getState().setTTSEffectsEnabled(false);

      const stored = JSON.parse(mockStorage.get('aios-tts-config')!);
      expect(stored.ttsEffectsEnabled).toBe(false);
    });
  });

  // ─── Voice Backend Config Persistence ────────────────────────────────

  describe('setVoiceBackend', () => {
    it('should update voiceBackend in state', () => {
      useVoiceStore.getState().setVoiceBackend('gemini-live');
      expect(useVoiceStore.getState().voiceBackend).toBe('gemini-live');
    });

    it('should persist to localStorage', () => {
      useVoiceStore.getState().setVoiceBackend('gemini-live');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'aios-voice-config',
        expect.any(String),
      );
      const stored = JSON.parse(mockStorage.get('aios-voice-config')!);
      expect(stored.voiceBackend).toBe('gemini-live');
    });

    it('should persist all voice config fields together', () => {
      useVoiceStore.getState().setGeminiApiKey('gem-key');
      useVoiceStore.getState().setGeminiVoiceName('Puck');
      useVoiceStore.getState().setVoiceBackend('gemini-live');

      const stored = JSON.parse(mockStorage.get('aios-voice-config')!);
      expect(stored.voiceBackend).toBe('gemini-live');
      expect(stored.geminiApiKey).toBe('gem-key');
      expect(stored.geminiVoiceName).toBe('Puck');
    });

    it('should accept all valid voice backends', () => {
      const backends: VoiceBackend[] = ['multi-service', 'gemini-live'];
      for (const backend of backends) {
        useVoiceStore.getState().setVoiceBackend(backend);
        expect(useVoiceStore.getState().voiceBackend).toBe(backend);
      }
    });
  });

  describe('setGeminiApiKey', () => {
    it('should update geminiApiKey in state', () => {
      useVoiceStore.getState().setGeminiApiKey('gemini-secret');
      expect(useVoiceStore.getState().geminiApiKey).toBe('gemini-secret');
    });

    it('should persist to localStorage with full voice config', () => {
      useVoiceStore.getState().setVoiceBackend('gemini-live');
      useVoiceStore.getState().setGeminiApiKey('gem-api-key');

      const stored = JSON.parse(mockStorage.get('aios-voice-config')!);
      expect(stored.geminiApiKey).toBe('gem-api-key');
      expect(stored.voiceBackend).toBe('gemini-live');
    });
  });

  describe('setGeminiVoiceName', () => {
    it('should update geminiVoiceName in state', () => {
      useVoiceStore.getState().setGeminiVoiceName('Puck');
      expect(useVoiceStore.getState().geminiVoiceName).toBe('Puck');
    });

    it('should persist to localStorage', () => {
      useVoiceStore.getState().setGeminiVoiceName('Aoede');

      const stored = JSON.parse(mockStorage.get('aios-voice-config')!);
      expect(stored.geminiVoiceName).toBe('Aoede');
    });
  });

  // ─── localStorage Loading ────────────────────────────────────────────

  describe('localStorage persistence round-trip', () => {
    it('should save and retrieve TTS config correctly', () => {
      useVoiceStore.getState().setTTSProvider('edge');
      useVoiceStore.getState().setTTSApiKey('edge-key');
      useVoiceStore.getState().setTTSVoiceId('edge-voice');
      useVoiceStore.getState().setTTSEffectsEnabled(false);

      const stored = JSON.parse(mockStorage.get('aios-tts-config')!);
      expect(stored).toEqual({
        ttsProvider: 'edge',
        ttsApiKey: 'edge-key',
        ttsVoiceId: 'edge-voice',
        ttsEffectsEnabled: false,
      });
    });

    it('should save and retrieve voice config correctly', () => {
      useVoiceStore.getState().setVoiceBackend('gemini-live');
      useVoiceStore.getState().setGeminiApiKey('my-gem-key');
      useVoiceStore.getState().setGeminiVoiceName('Charon');

      const stored = JSON.parse(mockStorage.get('aios-voice-config')!);
      expect(stored).toEqual({
        voiceBackend: 'gemini-live',
        geminiApiKey: 'my-gem-key',
        geminiVoiceName: 'Charon',
      });
    });
  });

  describe('localStorage error handling', () => {
    it('should not throw when localStorage.setItem fails on TTS save', () => {
      (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });

      // Should not throw
      expect(() => {
        useVoiceStore.getState().setTTSProvider('openai');
      }).not.toThrow();

      // State should still update
      expect(useVoiceStore.getState().ttsProvider).toBe('openai');
    });

    it('should not throw when localStorage.setItem fails on voice config save', () => {
      (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });

      expect(() => {
        useVoiceStore.getState().setVoiceBackend('gemini-live');
      }).not.toThrow();

      expect(useVoiceStore.getState().voiceBackend).toBe('gemini-live');
    });
  });

  // ─── Complex Scenarios ───────────────────────────────────────────────

  describe('complex state transitions', () => {
    it('should handle a full voice session lifecycle', () => {
      const store = useVoiceStore.getState;

      // Start session
      store().activate();
      expect(store().isActive).toBe(true);
      expect(store().state).toBe('idle');

      // Start listening
      store().setState('listening');
      store().setInputLevel(0.6);
      expect(store().state).toBe('listening');

      // User speaks
      store().setUserTranscript('What is the weather?');
      store().addToHistory({ role: 'user', text: 'What is the weather?' });

      // Agent thinking
      store().setState('thinking');
      store().setInputLevel(0);
      expect(store().state).toBe('thinking');

      // Agent responds
      store().setState('speaking');
      store().setAgentTranscript('The weather is sunny.');
      store().setOutputLevel(0.8);
      store().addToHistory({ role: 'agent', text: 'The weather is sunny.' });
      expect(store().conversationHistory).toHaveLength(2);

      // Back to idle
      store().setState('idle');
      store().setOutputLevel(0);

      // End session
      store().deactivate();
      expect(store().isActive).toBe(false);
      expect(store().conversationHistory).toEqual([]);
    });

    it('should handle executing state', () => {
      useVoiceStore.getState().activate();
      useVoiceStore.getState().setState('executing');
      expect(useVoiceStore.getState().state).toBe('executing');
    });

    it('should preserve TTS and voice config across activate/deactivate cycles', () => {
      // Configure
      useVoiceStore.getState().setTTSProvider('elevenlabs');
      useVoiceStore.getState().setTTSApiKey('el-key');
      useVoiceStore.getState().setVoiceBackend('gemini-live');
      useVoiceStore.getState().setGeminiApiKey('gem-key');

      // Activate then deactivate
      useVoiceStore.getState().activate();
      useVoiceStore.getState().deactivate();

      // Config should survive
      expect(useVoiceStore.getState().ttsProvider).toBe('elevenlabs');
      expect(useVoiceStore.getState().ttsApiKey).toBe('el-key');
      expect(useVoiceStore.getState().voiceBackend).toBe('gemini-live');
      expect(useVoiceStore.getState().geminiApiKey).toBe('gem-key');
    });

    it('should handle mute/unmute during active session', () => {
      useVoiceStore.getState().activate();
      useVoiceStore.getState().setState('listening');

      useVoiceStore.getState().toggleMute();
      expect(useVoiceStore.getState().isMuted).toBe(true);
      expect(useVoiceStore.getState().state).toBe('listening');

      useVoiceStore.getState().toggleMute();
      expect(useVoiceStore.getState().isMuted).toBe(false);
    });
  });
});
