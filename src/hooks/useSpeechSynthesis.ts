import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechSynthesisResult {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

// Priority keywords for higher-quality neural/enhanced voices (case-insensitive)
const PREMIUM_KEYWORDS = [
  'neural', 'enhanced', 'premium', 'natural',
  'google', 'microsoft', 'apple',
];

function scoreVoice(voice: SpeechSynthesisVoice, lang: string): number {
  let score = 0;
  const name = voice.name.toLowerCase();
  const voiceLang = voice.lang.toLowerCase();
  const targetLang = lang.toLowerCase();

  // Exact language match (e.g. pt-br === pt-br)
  if (voiceLang === targetLang) score += 100;
  // Prefix match (pt)
  else if (voiceLang.startsWith(targetLang.split('-')[0])) score += 50;
  // No language match at all
  else return 0;

  // Prefer premium/neural voices
  for (const kw of PREMIUM_KEYWORDS) {
    if (name.includes(kw)) { score += 30; break; }
  }

  // Prefer male voices for Jarvis feel (heuristic: names often contain "male"/"masculino")
  if (name.includes('male') || name.includes('masculin') || name.includes('daniel') || name.includes('jorge')) {
    score += 10;
  }

  // Prefer non-compact/non-legacy voices
  if (name.includes('compact') || name.includes('legacy')) score -= 20;

  // Default voice gets a small bump
  if (voice.default) score += 5;

  return score;
}

function getPreferredVoice(
  voices: SpeechSynthesisVoice[],
  lang: string
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  // Score all voices and pick the best
  const scored = voices
    .map((v) => ({ voice: v, score: scoreVoice(v, lang) }))
    .filter((v) => v.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) return scored[0].voice;

  // Absolute fallback
  return voices.find((v) => v.default) ?? voices[0] ?? null;
}

export function useSpeechSynthesis(lang: string = 'pt-BR'): SpeechSynthesisResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load voices (they may load asynchronously)
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!isSupported) {
          reject(new Error('Speech synthesis is not supported in this browser'));
          return;
        }

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getPreferredVoice(voices, lang);
        if (voice) {
          utterance.voice = voice;
        }
        utterance.lang = lang;
        // Slightly slower rate for more natural pacing
        utterance.rate = 0.95;
        // Slightly lower pitch for authoritative Jarvis-like feel
        utterance.pitch = 0.9;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          utteranceRef.current = null;
          resolve();
        };

        utterance.onerror = (event) => {
          setIsSpeaking(false);
          utteranceRef.current = null;
          // 'canceled' is expected when we call stop()
          if (event.error === 'canceled') {
            resolve();
          } else {
            reject(new Error(`Speech synthesis error: ${event.error}`));
          }
        };

        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
      });
    },
    [isSupported, voices, lang]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported, voices };
}
