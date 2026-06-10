import { useCallback, useEffect, useRef } from 'react';
import { useVoiceStore, type VoiceState } from '../stores/voiceStore';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useTTS } from './useTTS';
import { useAudioCapture } from './useAudioCapture';
import { useVoiceVisualization } from './useVoiceVisualization';
import { useChatStore } from '../stores/chatStore';

interface UseVoiceModeOptions {
  /** Send a message to the active agent. Typically from useChat().sendMessage */
  sendMessage: (content: string) => Promise<void>;
}

interface UseVoiceModeResult {
  // Lifecycle
  activate: () => void;
  deactivate: () => void;

  // PTT controls
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;

  // State
  isActive: boolean;
  voiceState: VoiceState;
  isSupported: boolean;
  userTranscript: string;
  agentTranscript: string;
  error: string | null;

  // Audio visualization
  inputLevel: number;
  outputLevel: number;
  analyserNode: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  averageLevel: number;
  peakLevel: number;
}

export function useVoiceMode({ sendMessage }: UseVoiceModeOptions): UseVoiceModeResult {
  const store = useVoiceStore();

  const lang = store.language;

  // Accumulated transcript across interim results
  const accumulatedTranscriptRef = useRef('');

  // Speech Recognition
  const recognition = useSpeechRecognition(lang, (text, isFinal) => {
    console.log('[VoiceMode] STT:', { text, isFinal });
    // Always keep the latest transcript (interim or final) so
    // stopListening never finds an empty ref when the user releases early
    accumulatedTranscriptRef.current = text;
    store.setUserTranscript(text);
  });

  // TTS (supports browser native, ElevenLabs, OpenAI)
  const tts = useTTS({
    provider: store.ttsProvider,
    apiKey: store.ttsApiKey,
    voiceId: store.ttsVoiceId,
    lang,
    effectsEnabled: store.ttsEffectsEnabled,
  });

  // Audio Capture
  const audioCapture = useAudioCapture(store.selectedDeviceId);

  // Visualization
  const visualization = useVoiceVisualization(audioCapture.analyserNode);

  // Sync audio input level to store
  // Use getState() to avoid depending on the full store object —
  // including `store` in deps causes an infinite render loop because
  // setInputLevel updates the store → new reference → effect re-fires.
  useEffect(() => {
    useVoiceStore.getState().setInputLevel(audioCapture.inputLevel);
  }, [audioCapture.inputLevel]);

  // Track isSupported across all required APIs
  const isSupported = recognition.isSupported && tts.isSupported;

  // --- Clause-level streaming TTS with prefetch pipeline ---
  // Splits on commas/semicolons/colons (not just sentence endings) and
  // prefetches audio for the next chunk while the current one plays.
  const processedLenRef = useRef(0);
  const sentenceQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const streamDoneRef = useRef(false);

  const playNextSentence = useCallback(async () => {
    if (isPlayingRef.current) return;
    const next = sentenceQueueRef.current.shift();
    if (!next) {
      // Queue empty — if stream is done, go idle
      if (streamDoneRef.current && useVoiceStore.getState().isActive) {
        store.setState('idle');
        store.setOutputLevel(0);
      }
      return;
    }

    isPlayingRef.current = true;
    if (useVoiceStore.getState().state !== 'speaking') {
      store.setState('speaking');
    }
    store.setAgentTranscript(next);

    // Prefetch next chunk while this one plays
    const upcoming = sentenceQueueRef.current[0];
    if (upcoming) tts.prefetch(upcoming);

    try {
      await tts.speak(next);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'TTS error');
    }

    isPlayingRef.current = false;
    // Continue with next queued sentence
    playNextSentence();
  }, [tts, store]);

  // Subscribe to streaming content and extract sentences progressively
  useEffect(() => {
    if (store.state !== 'thinking') return;

    // Reset refs for new response
    processedLenRef.current = 0;
    sentenceQueueRef.current = [];
    isPlayingRef.current = false;
    streamDoneRef.current = false;

    const unsubscribe = useChatStore.subscribe((chatState) => {
      const session = chatState.sessions.find((s) => s.id === chatState.activeSessionId);
      if (!session) return;

      const lastMsg = [...session.messages].reverse().find((m) => m.role === 'agent');
      if (!lastMsg?.content) return;

      const content = lastMsg.content;
      const newText = content.slice(processedLenRef.current);
      if (!newText) return;

      // Split on sentence endings AND clause boundaries (, ; :)
      // Buffer short clauses together until MIN_CHUNK_LEN for natural phrasing
      const MIN_CHUNK_LEN = 35;
      const clauseRegex = /[^.!?\n;:,]+[.!?\n;:,]+\s*/g;
      let match;
      let buffer = '';
      let lastEmittedEnd = 0;

      while ((match = clauseRegex.exec(newText)) !== null) {
        buffer += match[0];
        const endChar = match[0].trim().slice(-1);
        const isSentenceEnd = '.!?\n'.includes(endChar);

        if (isSentenceEnd || buffer.trim().length >= MIN_CHUNK_LEN) {
          const trimmed = buffer.trim();
          if (trimmed.length > 2) {
            sentenceQueueRef.current.push(trimmed);
          }
          buffer = '';
          lastEmittedEnd = match.index + match[0].length;
        }
      }

      if (lastEmittedEnd > 0) {
        processedLenRef.current += lastEmittedEnd;
        playNextSentence();
      }

      // When streaming ends, flush any remaining text
      if (!chatState.isStreaming) {
        const remainder = content.slice(processedLenRef.current).trim();
        if (remainder.length > 2) {
          sentenceQueueRef.current.push(remainder);
          processedLenRef.current = content.length;
        }
        streamDoneRef.current = true;

        // Save full response to history
        store.setAgentTranscript(content);
        store.addToHistory({ role: 'agent', text: content });

        playNextSentence();
      }
    });

    return unsubscribe;
  }, [store.state === 'thinking']); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Lifecycle ---

  const activate = useCallback(() => {
    store.activate();
  }, [store]);

  const deactivate = useCallback(() => {
    // Tear down everything
    recognition.stop();
    tts.stop();
    audioCapture.stopCapture();
    accumulatedTranscriptRef.current = '';
    store.deactivate();
  }, [store, recognition, tts, audioCapture]);

  // --- PTT Flow ---

  const startListening = useCallback(async () => {
    console.log('[VoiceMode] startListening called', { isSupported, isMuted: store.isMuted });

    if (!isSupported) {
      store.setError('Voice is not supported in this browser');
      return;
    }

    if (store.isMuted) {
      store.setError('Microfone silenciado');
      return;
    }

    store.setError(null);
    store.setUserTranscript('');
    accumulatedTranscriptRef.current = '';

    try {
      console.log('[VoiceMode] Starting audio capture + recognition...');
      // Start mic capture and speech recognition in parallel
      await Promise.all([
        audioCapture.startCapture(),
        recognition.start(),
      ]);
      console.log('[VoiceMode] Listening started successfully');
      store.setState('listening');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start listening';
      console.error('[VoiceMode] startListening error:', msg);
      store.setError(msg);
      audioCapture.stopCapture();
      recognition.stop();
    }
  }, [isSupported, store, audioCapture, recognition]);

  const stopListening = useCallback(async () => {
    console.log('[VoiceMode] stopListening called');
    // Stop recognition and mic
    recognition.stop();
    audioCapture.stopCapture();

    const transcript = accumulatedTranscriptRef.current.trim();
    console.log('[VoiceMode] Accumulated transcript:', JSON.stringify(transcript));

    if (!transcript) {
      store.setState('idle');
      store.setUserTranscript('');
      store.setError('Nenhuma fala detectada. Verifique se o microfone correto esta selecionado.');
      // Auto-clear error after 4 seconds
      setTimeout(() => {
        if (useVoiceStore.getState().error?.startsWith('Nenhuma fala')) {
          useVoiceStore.getState().setError(null);
        }
      }, 4000);
      return;
    }

    // Transition to thinking and send to agent
    store.setState('thinking');
    store.setUserTranscript(transcript);

    // Add user message to conversation history
    store.addToHistory({ role: 'user', text: transcript });

    try {
      await sendMessage(transcript);
      // The response watcher (useEffect above) handles the transition
      // from 'thinking' -> 'speaking' -> 'idle'
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      store.setError(msg);
      store.setState('idle');
    }
  }, [recognition, audioCapture, store, sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognition.stop();
      tts.stop();
      audioCapture.stopCapture();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only on unmount
  }, []);

  return {
    // Lifecycle
    activate,
    deactivate,

    // PTT
    startListening,
    stopListening,

    // State
    isActive: store.isActive,
    voiceState: store.state,
    isSupported,
    userTranscript: store.userTranscript,
    agentTranscript: store.agentTranscript,
    error: store.error,

    // Audio visualization
    inputLevel: store.inputLevel,
    outputLevel: store.outputLevel,
    analyserNode: audioCapture.analyserNode,
    frequencyData: visualization.frequencyData,
    timeDomainData: visualization.timeDomainData,
    averageLevel: visualization.averageLevel,
    peakLevel: visualization.peakLevel,
  };
}
