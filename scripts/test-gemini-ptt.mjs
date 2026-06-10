#!/usr/bin/env node
/**
 * Test Gemini Live PTT flow — matches exactly what the app does:
 * 1. Connect with manual VAD + system instruction + transcription
 * 2. Stream audio continuously (simulating mic)
 * 3. Send activityStart (PTT down)
 * 4. Continue streaming audio with speech content
 * 5. Send activityEnd (PTT up)
 * 6. Wait for audio response + transcription
 *
 * Usage: node scripts/test-gemini-ptt.mjs <API_KEY>
 */

import { WebSocket } from 'ws'

const API_KEY = process.argv[2]
if (!API_KEY) {
  console.error('Usage: node scripts/test-gemini-ptt.mjs <GEMINI_API_KEY>')
  process.exit(1)
}

const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`
const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025'
const SAMPLE_RATE = 16000
const CHUNK_SIZE = 2048

function generateSilenceChunk() {
  return Buffer.from(new Int16Array(CHUNK_SIZE).buffer).toString('base64')
}

function generateToneChunk(freq = 300, offset = 0) {
  const int16 = new Int16Array(CHUNK_SIZE)
  for (let i = 0; i < CHUNK_SIZE; i++) {
    int16[i] = Math.floor(Math.sin(2 * Math.PI * freq * (offset + i) / SAMPLE_RATE) * 16000)
  }
  return Buffer.from(int16.buffer).toString('base64')
}

console.log('=== Gemini Live PTT End-to-End Test ===\n')

const ws = new WebSocket(WS_URL)
let audioChunks = 0
let inputTranscript = ''
let outputTranscript = ''
let streamInterval = null
let sampleOffset = 0

const timeout = setTimeout(() => {
  console.log('\n  TIMEOUT (20s)')
  clearInterval(streamInterval)
  ws.close()
}, 20000)

ws.on('open', () => {
  console.log('1. Connected → sending setup (manual VAD + system instruction + transcription)...')
  ws.send(JSON.stringify({
    setup: {
      model: MODEL,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
      realtimeInputConfig: {
        automaticActivityDetection: { disabled: true },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [{
          text: 'Voce e um assistente de IA chamado AIOS. Responda sempre em portugues brasileiro de forma natural, concisa e prestativa. Seja direto e eficiente nas respostas.',
        }],
      },
    },
  }))
})

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString())

  if (msg.error) {
    console.log(`  ERROR: ${msg.error.message || JSON.stringify(msg.error)}`)
    clearTimeout(timeout)
    clearInterval(streamInterval)
    ws.close()
    return
  }

  if (msg.setupComplete) {
    console.log('2. Setup complete')

    // Start streaming silence continuously (simulating mic always on)
    console.log('3. Streaming silence (mic always on)...')
    streamInterval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(streamInterval)
        return
      }
      const chunk = generateSilenceChunk()
      ws.send(JSON.stringify({
        realtimeInput: {
          audio: { mimeType: `audio/pcm;rate=${SAMPLE_RATE}`, data: chunk },
        },
      }))
    }, Math.floor(CHUNK_SIZE / SAMPLE_RATE * 1000)) // ~128ms per chunk

    // After 500ms of silence, start PTT
    setTimeout(() => {
      console.log('4. PTT DOWN → activityStart')
      ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }))

      // Switch to tone audio (simulating speech)
      clearInterval(streamInterval)
      sampleOffset = 0
      streamInterval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          clearInterval(streamInterval)
          return
        }
        const chunk = generateToneChunk(300, sampleOffset)
        sampleOffset += CHUNK_SIZE
        ws.send(JSON.stringify({
          realtimeInput: {
            audio: { mimeType: `audio/pcm;rate=${SAMPLE_RATE}`, data: chunk },
          },
        }))
      }, Math.floor(CHUNK_SIZE / SAMPLE_RATE * 1000))

      // After 1.5s of "speech", release PTT
      setTimeout(() => {
        console.log('5. PTT UP → activityEnd')
        ws.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }))

        // Switch back to silence
        clearInterval(streamInterval)
        streamInterval = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            clearInterval(streamInterval)
            return
          }
          ws.send(JSON.stringify({
            realtimeInput: {
              audio: { mimeType: `audio/pcm;rate=${SAMPLE_RATE}`, data: generateSilenceChunk() },
            },
          }))
        }, Math.floor(CHUNK_SIZE / SAMPLE_RATE * 1000))
      }, 1500)
    }, 500)
  }

  if (msg.serverContent) {
    const sc = msg.serverContent

    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) {
          audioChunks++
          if (audioChunks === 1) console.log('6. Receiving audio response...')
        }
      }
    }

    if (sc.inputTranscription?.text) {
      inputTranscript += sc.inputTranscription.text
      process.stdout.write(`  [user]: "${sc.inputTranscription.text}" `)
    }

    if (sc.outputTranscription?.text) {
      outputTranscript += sc.outputTranscription.text
      process.stdout.write(`  [gemini]: "${sc.outputTranscription.text}" `)
    }

    if (sc.turnComplete) {
      console.log(`\n7. TURN COMPLETE!`)
      console.log(`   Audio chunks: ${audioChunks}`)
      console.log(`   Input transcript: "${inputTranscript}"`)
      console.log(`   Output transcript: "${outputTranscript}"`)
      console.log(`\n   ${audioChunks > 0 ? '✅ SUCCESS — Audio response received!' : '❌ FAIL — No audio response'}`)
      clearTimeout(timeout)
      clearInterval(streamInterval)
      ws.close()
    }
  }
})

ws.on('close', (code) => {
  clearTimeout(timeout)
  clearInterval(streamInterval)
  console.log(`\nConnection closed (code ${code})`)
})

ws.on('error', (e) => {
  console.log(`Error: ${e.message}`)
  clearTimeout(timeout)
  clearInterval(streamInterval)
})
