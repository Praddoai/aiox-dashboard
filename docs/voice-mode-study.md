# AIOS Platform — Voice Mode Study

## Status: RESEARCH COMPLETE | Ready for Decision

---

## 1. EXECUTIVE SUMMARY

O Voice Mode transforma a interacao com agentes AIOS de texto para conversacao de voz em tempo real. O usuario fala, o agente "pensa" e responde com voz sintetizada — tudo com feedback visual imersivo (orb neon animado, waveforms reativos).

**O que existe hoje:**
- Chat com SSE streaming funcionando (POST `/api/execute/agent/stream`)
- Botao de microfone no ChatInput.tsx (UI stub — sem implementacao real)
- Tipo `MessageAttachment` ja suporta `type: 'audio'`
- WebSocket manager existe mas nao e usado no chat
- Hook `useSound.ts` usa Web Audio API para efeitos sonoros de UI
- Zero libs de audio/voz no projeto

**O que vamos construir:**
- Voice mode full-duplex com STT + LLM + TTS em pipeline
- UI imersiva com orb 3D reativo ao audio (tema AIOX cyberpunk)
- 4 estados visuais: idle / listening / thinking / speaking
- Push-to-talk + hands-free com VAD (Voice Activity Detection)
- Transcript em tempo real sincronizado com o chat existente

---

## 2. ARQUITETURA PROPOSTA

```
+------------------+     +-------------------+     +------------------+
|   BROWSER        |     |   BACKEND         |     |   AI SERVICES    |
|                  |     |   (Fastify)       |     |                  |
|  Microphone      |     |                   |     |  STT Provider    |
|  getUserMedia()  +---->+  WebSocket Server +---->+  (Deepgram/      |
|                  | ws  |  /ws/voice        | ws  |   Whisper)       |
|  Web Audio API   |     |                   |     |                  |
|  AnalyserNode    |     |  Audio Router     |     |  LLM Provider    |
|  (visualization) |     |  VAD Processing   +---->+  (current AIOS   |
|                  |     |  Session Mgmt     |     |   execute flow)  |
|  TTS Playback    +<----+                   |     |                  |
|  AudioContext    | ws  |  TTS Streaming    +<----+  TTS Provider    |
|                  |     |                   |     |  (Cartesia/      |
|  3D Orb (Three)  |     |                   |     |   ElevenLabs)    |
+------------------+     +-------------------+     +------------------+
```

### Pipeline de Voz (end-to-end)

```
User fala -> Mic capture -> VAD detect speech
  -> Audio chunks via WebSocket -> STT (streaming)
    -> Transcript parcial exibido em tempo real
      -> Speech complete -> Full transcript -> LLM execute
        -> LLM streams tokens -> TTS streaming
          -> Audio chunks back via WebSocket -> Playback
            -> AnalyserNode feeds Orb visualization
```

### Latencia Estimada por Etapa

| Etapa | Latencia | Acumulado |
|-------|----------|-----------|
| Mic capture + VAD | ~20ms | 20ms |
| Audio -> STT (streaming) | ~300ms | 320ms |
| STT -> LLM first token | ~200ms | 520ms |
| LLM -> TTS first audio | ~90ms | 610ms |
| TTS -> Speaker playback | ~20ms | 630ms |
| **Total voice-to-voice** | | **~630ms** |

Meta: < 1 segundo voice-to-voice. Aceitavel para conversacao natural.

---

## 3. OPCOES DE STACK

### OPCAO A: End-to-End Managed (OpenAI Realtime API)

```
Browser <--WebRTC--> OpenAI Realtime API (GPT-4o)
```

| Aspecto | Detalhe |
|---------|---------|
| Como funciona | Speech-to-speech nativo. Um unico modelo faz STT+LLM+TTS |
| Transporte | WebRTC (browser) ou WebSocket (server) |
| Latencia | 220-450ms voice-to-voice |
| Qualidade | Excelente (GPT-4o nativo) |
| Custo | ~$0.30/min (audio in $0.06 + audio out $0.24) |
| React SDK | `@openai/agents-realtime` (browser package) |
| Pros | Menor complexidade, melhor latencia, tool calling nativo |
| Cons | Custo alto, preso ao GPT-4o, nao usa os agents AIOS existentes |

**Veredicto:** Excelente tech, mas nao se integra com o pipeline AIOS existente (que usa agentes com system prompts customizados). Seria um "modo paralelo" ao chat.

---

### OPCAO B: ElevenLabs Conversational AI

```
Browser <--WebRTC--> ElevenLabs Conv. AI <--> Custom LLM backend
```

| Aspecto | Detalhe |
|---------|---------|
| Como funciona | ElevenLabs gerencia STT+TTS, delega raciocinio para LLM externo |
| Transporte | WebRTC (desde Jul 2025) |
| Latencia | ~300-500ms voice-to-voice |
| Qualidade | Melhor TTS do mercado, voice cloning disponivel |
| Custo | $0.08-0.10/min |
| React SDK | `@elevenlabs/react` (oficial, bem mantido) |
| Pros | Qualidade superior de voz, suporta LLM custom, voice cloning |
| Cons | Depende de servico externo para audio, LLM precisa de adapter |

**Veredicto:** Boa opcao se quisermos qualidade premium de voz rapidamente. Pode plugar no backend AIOS como LLM provider.

---

### OPCAO C: Pipeline Modular (RECOMENDADA)

```
Browser -> Deepgram STT -> AIOS Backend (LLM) -> Cartesia TTS -> Browser
```

| Aspecto | Detalhe |
|---------|---------|
| STT | Deepgram Nova-3 ($0.008/min, ~300ms, WebSocket streaming) |
| LLM | Pipeline AIOS existente (execute/agent/stream) — sem mudanca |
| TTS | Cartesia Sonic 3 ($0.03/min, 40-90ms TTFA, WebSocket) |
| VAD | Silero VAD via `@ricky0123/vad` (roda no browser, ONNX) |
| Transporte | WebSocket para audio, SSE existente para LLM |
| Custo total | ~$0.04-0.05/min |
| Pros | Maximo controle, menor custo, usa pipeline AIOS existente |
| Cons | Mais complexo de implementar, mais pontos de falha |

**Veredicto: RECOMENDADA.** Reutiliza 100% do pipeline LLM existente. O voice mode e uma camada adicional (STT antes, TTS depois) em vez de uma substituicao. Custo 6x menor que OpenAI Realtime.

---

### OPCAO D: Hibrida (Recomendada para MVP)

```
Phase 1: Browser STT (Web Speech API) + AIOS LLM + Browser TTS
Phase 2: Upgrade para Deepgram + Cartesia (Opcao C)
```

| Aspecto | Detalhe |
|---------|---------|
| STT MVP | Web Speech API (gratis, Chrome/Edge, qualidade ok) |
| LLM | Pipeline AIOS existente |
| TTS MVP | Web Speech API (gratis, qualidade basica) |
| Custo MVP | $0.00 (alem do LLM que ja existe) |
| Upgrade path | Trocar providers sem mudar arquitetura |

**Veredicto:** Melhor para validar o conceito rapidamente com custo zero de voice. Arquitetura desenhada para swap facil de providers.

---

## 4. RECOMENDACAO FINAL

### Implementar em 2 fases:

**FASE 1 — MVP Voice Mode (1-2 semanas)**
- Web Speech API para STT (gratis, funciona em Chrome/Edge/Safari)
- Pipeline AIOS existente para LLM (zero mudanca no backend)
- Web Speech API para TTS (gratis, qualidade basica)
- UI: Orb CSS puro (sem Three.js) + waveform canvas
- Modo: Push-to-talk (segurar botao)
- Custo adicional: $0

**FASE 2 — Production Voice Mode (2-4 semanas)**
- Deepgram Nova-3 para STT (streaming WebSocket)
- Cartesia Sonic 3 para TTS (40ms latencia)
- Silero VAD para hands-free
- UI: Orb 3D com Three.js + React Three Fiber + Bloom shader
- Backend: novo endpoint WebSocket `/ws/voice` para routing de audio
- Custo: ~$0.05/min

---

## 5. DESIGN DO VOICE MODE UI

### Conceito Visual: "AIOX Neural Orb"

Inspirado em: ChatGPT Blue Orb + ElevenLabs Orb + estetica AIOX cyberpunk.

```
+------------------------------------------------------------------+
|                                                                    |
|                    [AIOX VOICE MODE]                               |
|                                                                    |
|                         .--~~--.                                   |
|                       .'  neon  '.                                 |
|                      /  #D1FF00   \     <- Orb 3D com Perlin      |
|                     |   reativo    |       noise, glow neon,       |
|                     |   ao audio   |       bloom shader             |
|                      \            /                                 |
|                       '.        .'                                  |
|                         '--~~--'                                   |
|                                                                    |
|              "Listening..."  /  "Thinking..."                      |
|                                                                    |
|    +--------------------------------------------------+           |
|    | Transcript em tempo real aparece aqui...          |           |
|    | O usuario fala e o texto vai aparecendo.          |           |
|    +--------------------------------------------------+           |
|                                                                    |
|    [  PUSH TO TALK  ]    [ HANDS-FREE ]    [ X FECHAR ]           |
|                                                                    |
+------------------------------------------------------------------+
```

### 4 Estados Visuais do Orb

| Estado | Visual | Cor | Animacao |
|--------|--------|-----|----------|
| **IDLE** | Orb pulsando suave | #D1FF00 dim (30% opacity) | Breathing lento (2s cycle), Perlin noise sutil |
| **LISTENING** | Orb brilha, reage ao mic | #D1FF00 full brightness | Audio-reactive displacement, glow intensifica |
| **THINKING** | Orb gira internamente | #D1FF00 -> #0099FF gradient | Rotacao do noise pattern, particulas orbitando |
| **SPEAKING** | Orb pulsa com a voz do agent | #D1FF00 neon intenso | TTS audio drives displacement + glow radius |

### Elementos de UI

1. **Orb Central** (200-300px)
   - MVP: CSS puro com radial-gradient + box-shadow multi-layer + keyframes
   - V2: Three.js sphere com Perlin noise vertex displacement + Bloom post-processing

2. **Transcript Area**
   - Texto aparece em tempo real (typewriter effect)
   - User speech em cor neutra, Agent speech em #D1FF00
   - Auto-scroll suave

3. **Waveform Bar** (opcional)
   - Canvas horizontal mostrando amplitude do audio
   - Cor #D1FF00 com fade gradient

4. **Controls**
   - Push-to-talk: botao grande central (hold)
   - Hands-free toggle: switch para VAD
   - Mute mic: toggle
   - Close: sair do voice mode

5. **Agent Info**
   - Avatar do agente atual (ja implementado)
   - Nome + titulo
   - Indicador de estado (listening/thinking/speaking)

### Layout Modes

- **Overlay Mode**: Voice mode abre como overlay fullscreen sobre o chat
- **Inline Mode**: Orb compacto integrado ao chat header (toggle)
- **Standalone Mode**: Rota dedicada `/voice` para experiencia imersiva

---

## 6. ESTRUTURA DE ARQUIVOS PROPOSTA

```
src/
  components/
    voice/
      VoiceMode.tsx              # Container principal (overlay)
      VoiceOrb.tsx               # Orb CSS (MVP) / Three.js (V2)
      VoiceOrbGL.tsx             # Orb WebGL com Three.js (V2)
      VoiceTranscript.tsx        # Area de transcricao em tempo real
      VoiceControls.tsx          # Botoes (PTT, hands-free, mute, close)
      VoiceWaveform.tsx          # Canvas waveform visualization
      VoiceAgentInfo.tsx         # Info do agente ativo
      index.ts

  hooks/
    useVoiceMode.ts              # State machine principal (idle/listening/thinking/speaking)
    useAudioCapture.ts           # getUserMedia + MediaRecorder + AnalyserNode
    useAudioPlayback.ts          # AudioContext para playback de TTS
    useSpeechRecognition.ts      # Abstraction layer (Web Speech API -> Deepgram)
    useSpeechSynthesis.ts        # Abstraction layer (Web Speech API -> Cartesia)
    useVoiceVisualization.ts     # AnalyserNode data para orb/waveform

  services/
    voice/
      VoiceSessionManager.ts     # Gerencia sessao de voz (connect/disconnect)
      STTProvider.ts             # Interface + implementacoes (WebSpeech, Deepgram)
      TTSProvider.ts             # Interface + implementacoes (WebSpeech, Cartesia)
      VADProvider.ts             # Voice Activity Detection (Silero)
      index.ts

  stores/
    voiceStore.ts                # Zustand store (state, transcript, config)
```

---

## 7. DEPENDENCIAS NECESSARIAS

### MVP (Fase 1) — Zero novas deps
- Web Speech API (nativo do browser)
- Web Audio API (nativo do browser)
- Canvas 2D (nativo do browser)
- CSS animations (ja existe no projeto)

### Production (Fase 2)
| Package | Proposito | Tamanho |
|---------|-----------|---------|
| `@deepgram/sdk` | STT streaming | ~50KB |
| `@cartesia/cartesia-js` | TTS streaming | ~30KB |
| `@ricky0123/vad-web` | VAD no browser (Silero) | ~2MB (ONNX model) |
| `three` | 3D Orb rendering | ~150KB (tree-shaked) |
| `@react-three/fiber` | React wrapper para Three.js | ~40KB |
| `@react-three/drei` | Helpers (Bloom, etc) | ~30KB |
| `@react-three/postprocessing` | Bloom shader | ~20KB |

---

## 8. PROVIDER ABSTRACTION

Arquitetura com interface para trocar providers sem mudar UI:

```typescript
// STTProvider interface
interface STTProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  onError(callback: (error: Error) => void): void;
}

// Implementacoes
class WebSpeechSTT implements STTProvider { ... }    // MVP (gratis)
class DeepgramSTT implements STTProvider { ... }      // Production

// TTSProvider interface
interface TTSProvider {
  speak(text: string): Promise<void>;
  speakStream(tokenStream: AsyncIterable<string>): Promise<void>;
  stop(): void;
  onAudioData(callback: (data: Float32Array) => void): void;
}

// Implementacoes
class WebSpeechTTS implements TTSProvider { ... }     // MVP (gratis)
class CartesiaTTS implements TTSProvider { ... }       // Production

// VADProvider interface
interface VADProvider {
  start(): Promise<void>;
  stop(): void;
  onSpeechStart(callback: () => void): void;
  onSpeechEnd(callback: () => void): void;
}
```

---

## 9. STATE MACHINE

```
                    +--------+
           +------->|  IDLE  |<------+
           |        +---+----+       |
           |            |            |
           |     mic activated       |
           |     or VAD detect       |
           |            |            |
           |       +----v-----+      |
           |       | LISTENING|      |
           |       +----+-----+      |
           |            |            |
           |     speech complete     |
           |     (silence detect)    |
           |            |            |
      agent done   +----v-----+     error/
      speaking     | THINKING |     cancel
           |       +----+-----+      |
           |            |            |
           |     LLM first token     |
           |     + TTS audio start   |
           |            |            |
           |       +----v-----+      |
           +-------+ SPEAKING |------+
                   +----------+
```

Zustand store:

```typescript
interface VoiceState {
  // Mode
  isActive: boolean;
  mode: 'push-to-talk' | 'hands-free';

  // State machine
  state: 'idle' | 'listening' | 'thinking' | 'speaking';

  // Transcript
  userTranscript: string;        // STT parcial do usuario
  agentTranscript: string;       // Resposta do agente
  conversationHistory: Array<{ role: 'user' | 'agent'; text: string }>;

  // Audio levels (para visualizacao)
  inputLevel: number;            // 0-1, mic amplitude
  outputLevel: number;           // 0-1, TTS amplitude

  // Config
  selectedVoice: string;
  autoSendToChat: boolean;       // Salvar no chat history
  language: string;

  // Actions
  activate: () => void;
  deactivate: () => void;
  startListening: () => void;
  stopListening: () => void;
}
```

---

## 10. INTEGRACAO COM CHAT EXISTENTE

O voice mode NAO substitui o chat — e um modo complementar:

1. **Ativacao**: Botao de mic no ChatInput (ja existe o stub) abre o VoiceMode overlay
2. **Contexto**: Voice mode herda o agente/squad/sessao ativos no chat
3. **Transcript -> Chat**: Cada troca de voz (user + agent) e adicionada ao chat history como mensagens normais
4. **Attachments**: Mensagens de voz podem incluir `type: 'audio'` no attachment (ja suportado)
5. **Commands**: Slash commands podem ser invocados por voz ("barra help")
6. **Seamless switch**: Usuario pode alternar entre texto e voz a qualquer momento

---

## 11. COMPARATIVO DE CUSTO MENSAL

Cenario: 100 usuarios, 10 min de voz/dia cada = 30.000 min/mes

| Stack | Custo/min | Custo/mes | Qualidade |
|-------|-----------|-----------|-----------|
| OpenAI Realtime (Opcao A) | $0.30 | $9,000 | Excelente |
| ElevenLabs Conv. AI (Opcao B) | $0.09 | $2,700 | Excelente |
| Deepgram + Cartesia (Opcao C) | $0.05 | $1,500 | Muito boa |
| Web Speech API (MVP) | $0.00* | $0* | Basica |

*Custo zero para STT/TTS; custo do LLM ja existente nao incluido.

---

## 12. RISCOS E MITIGACOES

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Web Speech API inconsistente entre browsers | Alto | Detectar suporte; fallback para Deepgram |
| Latencia perceptivel (>1.5s) | Alto | Streaming em todas as etapas; mostrar transcript parcial |
| Custo de API escala rapido | Medio | Rate limiting; limites por usuario; cache de TTS |
| Echo do speaker alimenta o mic | Alto | Echo cancellation via WebRTC; mute mic durante TTS |
| Privacidade (audio enviado a terceiros) | Medio | Consentimento explicito; opcao de STT local (Whisper.cpp WASM) |
| Three.js pesado em mobile | Medio | CSS orb como fallback; lazy load do bundle 3D |

---

## 13. TIMELINE ESTIMADA

### Fase 1: MVP (5-8 dias uteis)
- [ ] Voice store + state machine
- [ ] STT provider (Web Speech API)
- [ ] TTS provider (Web Speech API)
- [ ] Audio capture hook (getUserMedia + AnalyserNode)
- [ ] Voice mode overlay UI
- [ ] CSS Orb com 4 estados
- [ ] Canvas waveform
- [ ] Push-to-talk
- [ ] Integracao com chat (transcript -> messages)
- [ ] Testes basicos

### Fase 2: Production (8-12 dias uteis)
- [ ] Deepgram STT integration
- [ ] Cartesia TTS integration
- [ ] Silero VAD (hands-free mode)
- [ ] WebSocket endpoint no backend (/ws/voice)
- [ ] Three.js Orb com Perlin noise + Bloom
- [ ] Voice cloning (ElevenLabs opcional)
- [ ] Persistencia de config de voz
- [ ] Testes de latencia e otimizacao
- [ ] A11y (ARIA labels, keyboard navigation)

---

## DECISAO NECESSARIA

Para prosseguir, preciso saber:

1. **Qual fase iniciar?** MVP (gratis, rapido) ou Production (qualidade superior)?
2. **Layout preferido?** Overlay fullscreen, inline no chat, ou rota dedicada?
3. **Backend disponivel?** Posso adicionar endpoint WebSocket no Fastify?
4. **Budget para APIs?** Deepgram + Cartesia (~$0.05/min) ou prefere gratis (Web Speech)?
