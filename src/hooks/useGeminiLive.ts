import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { buildEffectsChain, type EffectsChain } from '../lib/audio-effects';
import { AIOS_TOOL_DECLARATIONS, executeToolCall } from '../services/voice-task-router';

// Gemini Live API WebSocket endpoint
const GEMINI_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// ---------------------------------------------------------------------------
// AudioWorklet processor (inline) — captures raw PCM at 16kHz
// ---------------------------------------------------------------------------

const WORKLET_CODE = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
    this._chunkSize = 2048;
  }
  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;
    const next = new Float32Array(this._buffer.length + input.length);
    next.set(this._buffer);
    next.set(input, this._buffer.length);
    this._buffer = next;
    while (this._buffer.length >= this._chunkSize) {
      const chunk = this._buffer.slice(0, this._chunkSize);
      this._buffer = this._buffer.slice(this._chunkSize);
      this.port.postMessage(chunk);
    }
    return true;
  }
}
registerProcessor('pcm-capture', PCMCaptureProcessor);
`;

// ---------------------------------------------------------------------------
// Audio format helpers
// ---------------------------------------------------------------------------

function downsample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, buffer.length - 1);
    const frac = srcIdx - lo;
    result[i] = buffer[lo] * (1 - frac) + buffer[hi] * frac;
  }
  return result;
}

function float32ToInt16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseGeminiLiveResult {
  isConnected: boolean;
  isSpeaking: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  pttDown: () => void;
  pttUp: () => void;
}

export function useGeminiLive(): UseGeminiLiveResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const store = useVoiceStore();
  const apiKey = useVoiceStore((s) => s.geminiApiKey);
  const voiceName = useVoiceStore((s) => s.geminiVoiceName);

  const effectsEnabled = useVoiceStore((s) => s.ttsEffectsEnabled);

  const wsRef = useRef<WebSocket | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const effectsChainRef = useRef<EffectsChain | null>(null);
  const rafRef = useRef(0);
  const connectingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Level monitor
  // ---------------------------------------------------------------------------

  const monitorLevels = useCallback(() => {
    const inAnalyser = inputAnalyserRef.current;
    if (inAnalyser) {
      const buf = new Uint8Array(inAnalyser.fftSize);
      inAnalyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const s = (buf[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / buf.length);
      useVoiceStore.getState().setInputLevel(Math.min(1, rms * 4));
    }

    const outAnalyser = outputAnalyserRef.current;
    if (outAnalyser) {
      const buf = new Uint8Array(outAnalyser.fftSize);
      outAnalyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const s = (buf[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / buf.length);
      useVoiceStore.getState().setOutputLevel(Math.min(1, rms * 4));
    }

    rafRef.current = requestAnimationFrame(monitorLevels);
  }, []);

  // ---------------------------------------------------------------------------
  // Play audio chunk
  // ---------------------------------------------------------------------------

  const playAudioChunk = useCallback((base64Data: string) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;

    // Connect to effects chain input if available, otherwise direct to analyser
    const destination = effectsChainRef.current?.input ?? outputAnalyserRef.current;
    if (!destination) return;

    const float32 = base64ToFloat32(base64Data);
    if (float32.length === 0) return;

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);

    const now = ctx.currentTime;
    if (nextPlayTimeRef.current <= now) {
      nextPlayTimeRef.current = now + 0.05;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;
  }, []);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (workletRef.current) {
      workletRef.current.port.onmessage = null;
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close().catch(() => {});
      captureCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;
    effectsChainRef.current = null;
    nextPlayTimeRef.current = 0;
    connectingRef.current = false;
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  // ---------------------------------------------------------------------------
  // PTT: Push-to-Talk controls
  // ---------------------------------------------------------------------------

  const pttDown = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    console.log('[GeminiLive] PTT DOWN → activityStart');
    ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }));
    setIsSpeaking(true);
    useVoiceStore.getState().setState('listening');
    useVoiceStore.getState().setUserTranscript('');
  }, []);

  const pttUp = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    console.log('[GeminiLive] PTT UP → activityEnd');
    ws.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
    setIsSpeaking(false);
    useVoiceStore.getState().setState('thinking');
  }, []);

  // ---------------------------------------------------------------------------
  // Connect
  // ---------------------------------------------------------------------------

  const connect = useCallback(async () => {
    if (!apiKey) {
      store.setError('Insira a API Key do Google Gemini nas configuracoes de voz');
      return;
    }

    if (connectingRef.current || wsRef.current) {
      console.warn('[GeminiLive] Already connecting or connected');
      return;
    }
    connectingRef.current = true;

    store.setError(null);
    store.setUserTranscript('');
    store.setAgentTranscript('');

    try {
      // --- Audio capture ---
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Use native sample rate — downsample to 16kHz before sending
      const captureCtx = new AudioContext();
      captureCtxRef.current = captureCtx;
      if (captureCtx.state === 'suspended') await captureCtx.resume();
      const nativeSampleRate = captureCtx.sampleRate;
      console.log(`[GeminiLive] Native sample rate: ${nativeSampleRate}, will downsample to ${INPUT_SAMPLE_RATE}`);

      const mediaSource = captureCtx.createMediaStreamSource(stream);

      const inAnalyser = captureCtx.createAnalyser();
      inAnalyser.fftSize = 256;
      mediaSource.connect(inAnalyser);
      inputAnalyserRef.current = inAnalyser;

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      await captureCtx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);

      const worklet = new AudioWorkletNode(captureCtx, 'pcm-capture');
      mediaSource.connect(worklet);
      workletRef.current = worklet;

      // --- Audio playback ---
      const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      playbackCtxRef.current = playbackCtx;
      if (playbackCtx.state === 'suspended') await playbackCtx.resume();
      nextPlayTimeRef.current = 0;

      if (effectsEnabled) {
        // Jarvis effects chain: warmth → presence → compressor → reverb/delay → analyser → destination
        const chain = buildEffectsChain(playbackCtx);
        chain.output.connect(playbackCtx.destination);
        effectsChainRef.current = chain;
        outputAnalyserRef.current = chain.analyser;
        console.log('[GeminiLive] Jarvis audio effects enabled');
      } else {
        const outAnalyser = playbackCtx.createAnalyser();
        outAnalyser.fftSize = 256;
        outAnalyser.connect(playbackCtx.destination);
        outputAnalyserRef.current = outAnalyser;
      }

      // --- WebSocket ---
      const ws = new WebSocket(`${GEMINI_WS_URL}?key=${apiKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[GeminiLive] Connected, sending setup...');
        ws.send(JSON.stringify({
          setup: {
            model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName || 'Charon',
                  },
                },
              },
            },
            // Manual VAD — we control activityStart/activityEnd via PTT
            realtimeInputConfig: {
              automaticActivityDetection: { disabled: true },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            // AIOS tool declarations — task execution via Claude Code
            tools: [{
              functionDeclarations: AIOS_TOOL_DECLARATIONS,
            }],
            systemInstruction: {
              parts: [{
                text: [
                  'Voce e AIOS, um assistente de inteligencia artificial pessoal de alto nivel.',
                  'Seu estilo vocal e inspirado no JARVIS do Iron Man: calmo, confiante, articulado e levemente formal, mas nunca robotico.',
                  'Fale sempre em portugues brasileiro.',
                  'Seja conciso e direto — respostas curtas e precisas, como um assistente executivo eficiente.',
                  'Use um tom composto e seguro, como quem tem total dominio da situacao.',
                  'Evite exclamacoes exageradas, emojis verbais ou informalidade excessiva.',
                  'Quando cumprimentar, seja breve: "Ola, senhor. Como posso ajudar?" ou "Estou a disposicao."',
                  'Sempre responda com audio, mesmo que o usuario fale pouco.',
                  '',
                  'REGRA CRITICA DE EXECUCAO DE TAREFAS:',
                  'Voce e APENAS a interface de voz. Voce NAO executa codigo, NAO cria arquivos, NAO modifica sistemas.',
                  'Quando o usuario solicitar qualquer tarefa de desenvolvimento, engenharia, criacao de codigo, correcao de bugs,',
                  'deploy, testes, criacao de stories, workflows, ou qualquer operacao no sistema AIOS:',
                  '1. Use as ferramentas (function calls) disponiveis para delegar a execucao ao Claude Code via Engine API.',
                  '2. NUNCA tente responder com codigo ou implementacao diretamente — sempre delegue via tool call.',
                  '3. Apos receber o resultado da tool, resuma o resultado verbalmente para o usuario.',
                  '4. TODAS as tarefas vao para execute_task — o orquestrador AIOS decide qual agente e squad executam.',
                  '5. NUNCA escolha o agente — o orquestrador respeita a matrix de autoridade e delega automaticamente.',
                  '6. Para perguntas sobre status, use check_engine_health, list_jobs ou check_job_status.',
                  '7. Para verificar permissoes, use check_authority.',
                  '',
                  'Exemplos de roteamento:',
                  '- "Crie um componente de login" → execute_task("criar componente de login")',
                  '- "Faca uma revisao de codigo" → execute_task("revisar codigo do modulo X")',
                  '- "Inicie o ciclo de desenvolvimento da story" → start_workflow(story-development-cycle, ...)',
                  '- "O que esta rodando?" → list_jobs(status=running)',
                  '- "Como esta o sistema?" → check_engine_health()',
                  '- "Pare aquele job" → cancel_job(job_id)',
                  '- "Agende uma revisao diaria" → create_cron(daily-review, "0 9 * * *", ...)',
                  '- "O dev pode fazer push?" → check_authority(dev, git-push, development)',
                  '',
                  'Para dialogos conversacionais (cumprimentos, perguntas genericas, explicacoes conceituais), responda normalmente sem tool calls.',
                ].join('\n'),
              }],
            },
          },
        }));
      };

      ws.onmessage = async (event) => {
        let raw: string;
        if (event.data instanceof Blob) {
          raw = await event.data.text();
        } else {
          raw = event.data;
        }
        const msg = JSON.parse(raw);

        if (msg.error) {
          console.error('[GeminiLive] API error:', msg.error);
          const errMsg = msg.error.message || msg.error.status || JSON.stringify(msg.error);
          useVoiceStore.getState().setError(`Gemini: ${errMsg}`);
          cleanup();
          return;
        }

        // Setup complete — start streaming audio
        if (msg.setupComplete) {
          console.log('[GeminiLive] Ready! Hold SPACE to talk.');
          setIsConnected(true);
          useVoiceStore.getState().setState('idle');

          // Stream mic audio continuously to Gemini (downsample to 16kHz)
          worklet.port.onmessage = (e: MessageEvent) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              let pcm = e.data as Float32Array;
              if (nativeSampleRate !== INPUT_SAMPLE_RATE) {
                pcm = downsample(pcm, nativeSampleRate, INPUT_SAMPLE_RATE);
              }
              const base64 = float32ToInt16Base64(pcm);
              wsRef.current.send(
                JSON.stringify({
                  realtimeInput: {
                    audio: {
                      mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                      data: base64,
                    },
                  },
                }),
              );
            }
          };

          rafRef.current = requestAnimationFrame(monitorLevels);
        }

        // Tool calls — route to Claude Code via Engine API
        if (msg.toolCall) {
          console.log('[GeminiLive] Tool call received:', msg.toolCall);
          useVoiceStore.getState().setState('executing');
          useVoiceStore.getState().setAgentTranscript('Executando tarefa via Claude Code...');

          const functionCalls = msg.toolCall.functionCalls || [];
          const toolResponses = await Promise.all(
            functionCalls.map(async (fc: { id: string; name: string; args: Record<string, unknown> }) => {
              console.log(`[GeminiLive] Executing tool: ${fc.name}`, fc.args);
              const result = await executeToolCall(fc.name, fc.args || {});
              console.log(`[GeminiLive] Tool result:`, result.summary);
              return {
                id: fc.id,
                response: {
                  output: {
                    success: result.success,
                    summary: result.summary,
                    data: result.data ? JSON.stringify(result.data).slice(0, 2000) : undefined,
                  },
                },
              };
            }),
          );

          // Send tool responses back to Gemini so it can summarize vocally
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              toolResponse: {
                functionResponses: toolResponses,
              },
            }));
            console.log('[GeminiLive] Tool responses sent back to Gemini');
          }
        }

        // Server content
        if (msg.serverContent) {
          const sc = msg.serverContent;

          // Audio response
          if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData?.data) {
                if (useVoiceStore.getState().state !== 'speaking') {
                  console.log('[GeminiLive] Gemini responding with audio...');
                  useVoiceStore.getState().setState('speaking');
                }
                playAudioChunk(part.inlineData.data);
              }
            }
          }

          // Turn complete — persist transcripts to voice history
          if (sc.turnComplete) {
            console.log('[GeminiLive] Turn complete');
            const vs = useVoiceStore.getState();
            const userText = vs.userTranscript.trim();
            const agentText = vs.agentTranscript.trim();
            if (userText) vs.addToHistory({ role: 'user', text: userText });
            if (agentText) vs.addToHistory({ role: 'agent', text: agentText });
            // Reset transcripts for next turn
            vs.setUserTranscript('');
            vs.setAgentTranscript('');
            vs.setState('idle');
          }

          // Transcriptions
          if (sc.inputTranscription?.text) {
            const prev = useVoiceStore.getState().userTranscript;
            useVoiceStore.getState().setUserTranscript(prev + sc.inputTranscription.text);
          }
          if (sc.outputTranscription?.text) {
            const prev = useVoiceStore.getState().agentTranscript;
            useVoiceStore.getState().setAgentTranscript(prev + sc.outputTranscription.text);
          }
        }
      };

      ws.onerror = () => {
        useVoiceStore.getState().setError('Erro na conexao WebSocket com Gemini');
        cleanup();
      };

      ws.onclose = (e) => {
        console.log('[GeminiLive] Closed:', e.code, e.reason);
        if (e.code !== 1000 && e.code !== 1005) {
          useVoiceStore.getState().setError(`Gemini desconectou (code ${e.code})`);
        }
        cleanup();
      };
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Erro ao conectar');
      cleanup();
    } finally {
      connectingRef.current = false;
    }
  }, [apiKey, voiceName, effectsEnabled, store, cleanup, monitorLevels, playAudioChunk]);

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------

  const disconnect = useCallback(() => {
    cleanup();
    useVoiceStore.getState().setState('idle');
    useVoiceStore.getState().setInputLevel(0);
    useVoiceStore.getState().setOutputLevel(0);
  }, [cleanup]);

  // Auto-reconnect when voice or effects change while connected
  const prevVoiceRef = useRef(voiceName);
  const prevEffectsRef = useRef(effectsEnabled);
  useEffect(() => {
    const voiceChanged = prevVoiceRef.current !== voiceName;
    const effectsChanged = prevEffectsRef.current !== effectsEnabled;
    prevVoiceRef.current = voiceName;
    prevEffectsRef.current = effectsEnabled;

    if ((voiceChanged || effectsChanged) && isConnected) {
      console.log(`[GeminiLive] Settings changed, reconnecting...`);
      cleanup();
      // Small delay to let cleanup finish before reconnecting
      const timer = setTimeout(() => { connect(); }, 300);
      return () => clearTimeout(timer);
    }
  }, [voiceName, effectsEnabled, isConnected, cleanup, connect]);

  useEffect(() => {
    return () => { cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isConnected, isSpeaking, connect, disconnect, pttDown, pttUp };
}
