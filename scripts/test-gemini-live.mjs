#!/usr/bin/env node
/**
 * Test Gemini Live API — different audio input formats.
 * Usage: node scripts/test-gemini-live.mjs <API_KEY>
 */

import { WebSocket } from 'ws'

const API_KEY = process.argv[2]
if (!API_KEY) {
  console.error('Usage: node scripts/test-gemini-live.mjs <GEMINI_API_KEY>')
  process.exit(1)
}

const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`
const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025'

function generateSilence(durationMs) {
  const sampleRate = 16000
  const samples = Math.floor(sampleRate * durationMs / 1000)
  return Buffer.from(new Int16Array(samples).buffer).toString('base64')
}

function generateTone(durationMs, freq = 300) {
  const sampleRate = 16000
  const samples = Math.floor(sampleRate * durationMs / 1000)
  const int16 = new Int16Array(samples)
  for (let i = 0; i < samples; i++) {
    int16[i] = Math.floor(Math.sin(2 * Math.PI * freq * i / sampleRate) * 16000)
  }
  return Buffer.from(int16.buffer).toString('base64')
}

async function runTest(name, setupExtra, sendAudioFn) {
  console.log(`\n=== ${name} ===\n`)
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('  TIMEOUT (12s) — no response')
      ws.close()
      resolve(false)
    }, 12000)

    const ws = new WebSocket(WS_URL)
    let chunks = 0
    let gotTranscription = false

    ws.on('open', () => {
      const setup = {
        setup: {
          model: MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          },
          systemInstruction: { parts: [{ text: 'Diga apenas: Ola, estou funcionando.' }] },
          ...setupExtra,
        },
      }
      ws.send(JSON.stringify(setup))
    })

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString())

      if (msg.error) {
        console.log(`  ERROR: ${msg.error.message || JSON.stringify(msg.error)}`)
        clearTimeout(timeout)
        ws.close()
        resolve(false)
        return
      }

      if (msg.setupComplete) {
        console.log('  Setup OK. Sending audio...')
        sendAudioFn(ws)
      }

      if (msg.serverContent) {
        const sc = msg.serverContent
        if (sc.inputTranscription?.text) {
          gotTranscription = true
          process.stdout.write(`  transcription: "${sc.inputTranscription.text}" `)
        }
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) chunks++
          }
        }
        if (sc.turnComplete) {
          console.log(`\n  TURN COMPLETE! audio=${chunks} transcription=${gotTranscription}`)
          clearTimeout(timeout)
          ws.close()
          resolve(true)
        }
      }
    })

    ws.on('close', (code) => {
      clearTimeout(timeout)
      if (chunks === 0) console.log(`  Closed (${code}). audio=${chunks} transcription=${gotTranscription}`)
      resolve(chunks > 0)
    })

    ws.on('error', (e) => {
      console.log(`  Error: ${e.message}`)
      clearTimeout(timeout)
      resolve(false)
    })
  })
}

// Test 1: Text (baseline — known working)
await runTest('Text clientContent (baseline)', {}, (ws) => {
  ws.send(JSON.stringify({
    clientContent: {
      turns: [{ role: 'user', parts: [{ text: 'Ola' }] }],
      turnComplete: true,
    },
  }))
})

// Test 2: realtimeInput with "audio" field (new format)
await runTest('realtimeInput.audio + silence', {}, (ws) => {
  const tone = generateTone(500)
  ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: tone } } }))
  setTimeout(() => {
    ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: generateSilence(2000) } } }))
  }, 600)
})

// Test 3: realtimeInput with "mediaChunks" field (old format)
await runTest('realtimeInput.mediaChunks + silence', {}, (ws) => {
  const tone = generateTone(500)
  ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: tone }] } }))
  setTimeout(() => {
    ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: generateSilence(2000) }] } }))
  }, 600)
})

// Test 4: realtimeInput.audio + explicit activityEnd
await runTest('realtimeInput.audio + activityEnd', {
  realtimeInputConfig: {
    automaticActivityDetection: { disabled: true },
  },
}, (ws) => {
  ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }))
  const tone = generateTone(500)
  ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: tone } } }))
  setTimeout(() => {
    ws.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }))
    console.log('  Sent activityEnd')
  }, 700)
})

// Test 5: realtimeInput.audio + audioStreamEnd
await runTest('realtimeInput.audio + audioStreamEnd', {}, (ws) => {
  const tone = generateTone(500)
  ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: tone } } }))
  setTimeout(() => {
    ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    console.log('  Sent audioStreamEnd')
  }, 700)
})

// Test 6: mediaChunks + activityEnd (manual VAD)
await runTest('mediaChunks + activityEnd (manual VAD)', {
  realtimeInputConfig: {
    automaticActivityDetection: { disabled: true },
  },
}, (ws) => {
  ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }))
  const tone = generateTone(500)
  ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: tone }] } }))
  setTimeout(() => {
    ws.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }))
    console.log('  Sent activityEnd')
  }, 700)
})

console.log('\n=== All tests done! ===')
