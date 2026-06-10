import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API type declarations (not all browsers ship these globally)
interface SpeechRecognitionEventMap {
  audiostart: Event;
  audioend: Event;
  end: Event;
  error: SpeechRecognitionErrorEvent;
  nomatch: SpeechRecognitionEvent;
  result: SpeechRecognitionEvent;
  soundstart: Event;
  soundend: Event;
  speechstart: Event;
  speechend: Event;
  start: Event;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
  addEventListener<K extends keyof SpeechRecognitionEventMap>(
    type: K,
    listener: (this: SpeechRecognitionInstance, ev: SpeechRecognitionEventMap[K]) => void,
  ): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface UseSpeechRecognitionResult {
  start: () => Promise<void>;
  stop: () => void;
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  isFinal: boolean;
  error: string | null;
}

type TranscriptCallback = (text: string, isFinal: boolean) => void;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as Record<string, SpeechRecognitionConstructor | undefined>).SpeechRecognition ??
    (window as unknown as Record<string, SpeechRecognitionConstructor | undefined>).webkitSpeechRecognition ??
    null
  );
}

export function useSpeechRecognition(
  lang: string = 'pt-BR',
  onTranscript?: TranscriptCallback
): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef<TranscriptCallback | undefined>(onTranscript);
  const isSupported = getSpeechRecognitionCtor() !== null;

  // Keep callback ref fresh to avoid stale closures
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const start = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        const msg = 'Speech recognition is not supported in this browser';
        setError(msg);
        reject(new Error(msg));
        return;
      }

      // Stop any existing instance
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }

      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        console.log('[SpeechRecognition] onstart fired');
        setIsListening(true);
        setError(null);
        setTranscript('');
        setIsFinal(false);
        resolve();
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        const final = finalTranscript.length > 0;

        setTranscript(text);
        setIsFinal(final);
        onTranscriptRef.current?.(text, final);
      };

      recognition.onerror = (event) => {
        console.warn('[SpeechRecognition] onerror:', event.error, event.message);
        // 'aborted' is expected when we call stop/abort
        if (event.error === 'aborted') return;

        const msg = `Speech recognition error: ${event.error}`;
        setError(msg);
        setIsListening(false);

        // Reject only if we haven't started yet
        reject(new Error(msg));
      };

      recognition.onend = () => {
        console.log('[SpeechRecognition] onend');
        setIsListening(false);
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start recognition';
        setError(msg);
        reject(new Error(msg));
      }
    });
  }, [lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { start, stop, isListening, isSupported, transcript, isFinal, error };
}
