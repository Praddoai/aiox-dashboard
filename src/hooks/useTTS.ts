import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceStore, type TTSProvider } from '../stores/voiceStore';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { buildEffectsChain, type EffectsChain } from '../lib/audio-effects';

interface UseTTSOptions {
  provider: TTSProvider;
  apiKey: string;
  voiceId: string;
  lang: string;
  effectsEnabled: boolean;
}

interface UseTTSResult {
  speak: (text: string) => Promise<void>;
  prefetch: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

// ---------------------------------------------------------------------------
// Cloud TTS fetchers
// ---------------------------------------------------------------------------

async function fetchElevenLabsAudio(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<ArrayBuffer> {
  const id = voiceId || 'pNInz6obpgDQGcFmaJgB'; // Adam
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        // Higher stability = more consistent and natural, less random variation
        stability: 0.50,
        // High similarity = stays true to the original voice character
        similarity_boost: 0.80,
        // Moderate style = expressive but not theatrical
        style: 0.30,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs error ${res.status}: ${body || res.statusText}`);
  }
  return res.arrayBuffer();
}

async function fetchOpenAIAudio(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<ArrayBuffer> {
  const voice = voiceId || 'onyx';
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text,
      voice,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI TTS error ${res.status}: ${body || res.statusText}`);
  }
  return res.arrayBuffer();
}

// ---------------------------------------------------------------------------
// fal.ai MiniMax TTS (voice clone via queue API)
// ---------------------------------------------------------------------------

async function fetchFalAudio(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<ArrayBuffer> {
  const vid = voiceId || 'Calm_Woman';

  // Synchronous endpoint — blocks until result, no polling needed
  const res = await fetch('/fal-proxy/fal-ai/minimax/speech-2.8-hd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: text,
      voice_setting: {
        voice_id: vid,
        speed: 1,
        vol: 1,
        pitch: 0,
      },
      language_boost: 'Portuguese',
      audio_setting: {
        format: 'mp3',
        sample_rate: 44100,
        bitrate: 128000,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`fal.ai error ${res.status}: ${body || res.statusText}`);
  }

  const result = await res.json();
  const audioUrl = result.audio?.url;
  if (!audioUrl) throw new Error('fal.ai: no audio URL in response');

  const audioRes = await fetch(audioUrl);
  return audioRes.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Edge TTS (Microsoft neural voices — local server, no API key)
// ---------------------------------------------------------------------------

async function fetchEdgeTTSAudio(
  text: string,
  voiceId: string,
): Promise<ArrayBuffer> {
  const voice = voiceId || 'pt-BR-AntonioNeural';
  const res = await fetch('/edge-tts/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Edge TTS error ${res.status}: ${body || res.statusText}`);
  }
  return res.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export function useTTS({
  provider,
  apiKey,
  voiceId,
  lang,
  effectsEnabled,
}: UseTTSOptions): UseTTSResult {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const chainRef = useRef<EffectsChain | null>(null);
  const prefetchCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());

  // Browser fallback
  const browserSynthesis = useSpeechSynthesis(lang);

  const isSupported =
    provider === 'browser' ? browserSynthesis.isSupported : true;

  // Pump analyser data → voiceStore.outputLevel
  const monitorOutput = useCallback(function loop() {
    const analyser = chainRef.current?.analyser;
    if (!analyser) return;

    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);

    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const s = (buf[i] - 128) / 128;
      sum += s * s;
    }
    const rms = Math.sqrt(sum / buf.length);
    useVoiceStore.getState().setOutputLevel(Math.min(1, rms * 4));

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopCloud = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    chainRef.current = null;
    setIsSpeaking(false);
    useVoiceStore.getState().setOutputLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (provider === 'browser') {
      browserSynthesis.stop();
      return;
    }
    stopCloud();
  }, [provider, browserSynthesis, stopCloud]);

  const prefetch = useCallback((text: string) => {
    if (provider === 'browser' || prefetchCacheRef.current.has(text)) return;
    if (provider !== 'edge' && !apiKey) return;

    const fetchFn = provider === 'edge'
      ? fetchEdgeTTSAudio(text, voiceId)
      : provider === 'elevenlabs'
        ? fetchElevenLabsAudio(text, apiKey, voiceId)
        : provider === 'fal'
          ? fetchFalAudio(text, apiKey, voiceId)
          : fetchOpenAIAudio(text, apiKey, voiceId);

    fetchFn.then((data) => {
      prefetchCacheRef.current.set(text, data);
    }).catch(() => { /* prefetch failure is non-critical */ });
  }, [provider, apiKey, voiceId]);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      // Stop any current playback
      stop();

      if (provider === 'browser') {
        return browserSynthesis.speak(text);
      }

      // Edge TTS doesn't need an API key
      if (provider !== 'edge' && !apiKey) {
        const messages: Record<string, string> = {
          elevenlabs: 'Insira a API Key do ElevenLabs nas configuracoes de voz',
          openai: 'Insira a API Key da OpenAI nas configuracoes de voz',
          fal: 'Insira a API Key do fal.ai nas configuracoes de voz',
        };
        throw new Error(messages[provider] || 'API Key necessaria');
      }

      setIsSpeaking(true);

      try {
        // Check prefetch cache first, then fetch from provider
        const cached = prefetchCacheRef.current.get(text);
        let audioData: ArrayBuffer;
        if (cached) {
          audioData = cached;
          prefetchCacheRef.current.delete(text);
        } else if (provider === 'edge') {
          audioData = await fetchEdgeTTSAudio(text, voiceId);
        } else if (provider === 'elevenlabs') {
          audioData = await fetchElevenLabsAudio(text, apiKey, voiceId);
        } else if (provider === 'fal') {
          audioData = await fetchFalAudio(text, apiKey, voiceId);
        } else {
          audioData = await fetchOpenAIAudio(text, apiKey, voiceId);
        }

        // Get or create AudioContext
        if (
          !audioContextRef.current ||
          audioContextRef.current.state === 'closed'
        ) {
          audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        // Decode
        const audioBuffer = await ctx.decodeAudioData(audioData);

        // Source
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        sourceRef.current = source;

        if (effectsEnabled) {
          const chain = buildEffectsChain(ctx);
          chain.output.connect(ctx.destination);
          chainRef.current = chain;
          source.connect(chain.input);
          rafRef.current = requestAnimationFrame(monitorOutput);
        } else {
          // Direct to speakers (still use analyser for viz)
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyser.connect(ctx.destination);
          chainRef.current = { input: analyser, output: analyser, analyser };
          rafRef.current = requestAnimationFrame(monitorOutput);
        }

        return new Promise<void>((resolve, reject) => {
          source.onended = () => {
            stopCloud();
            resolve();
          };
          source.addEventListener('error', () => {
            stopCloud();
            reject(new Error('Audio playback error'));
          });
          source.start(0);
        });
      } catch (err) {
        setIsSpeaking(false);
        throw err;
      }
    },
    [provider, apiKey, voiceId, effectsEnabled, stop, stopCloud, browserSynthesis, monitorOutput],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* noop */ }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    speak,
    prefetch,
    stop,
    isSpeaking: provider === 'browser' ? browserSynthesis.isSpeaking : isSpeaking,
    isSupported,
  };
}
