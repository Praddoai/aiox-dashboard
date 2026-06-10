// ---------------------------------------------------------------------------
// Audio effects chain — subtle JARVIS character
//
// Design: the source voice is already high quality. We add a very subtle
// spatial/electronic sheen that reads as "AI assistant" without destroying
// the natural qualities.
//
// Chain: Source → Warmth (low-shelf) → Presence (peak) → Compressor
//          → dry mix  ─────────────────────────────────→ merge → Analyser → out
//          → convolver (micro-reverb) → wet gain       ↗
//          → micro-delay → delay gain                  ↗
// ---------------------------------------------------------------------------

export interface EffectsChain {
  input: AudioNode;
  output: AudioNode;
  analyser: AnalyserNode;
}

/** Generate a short "room tone" impulse — tight, subtle, not cavernous */
function createMicroReverb(ctx: AudioContext): AudioBuffer {
  const duration = 0.25;
  const decay = 0.08;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
    }
  }
  return buffer;
}

export function buildEffectsChain(ctx: AudioContext): EffectsChain {
  // 1. Sub-bass rolloff — clean up rumble, tighten the low end
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 80;
  highpass.Q.value = 0.7;

  // 2. Warmth: low-shelf boost — fuller, richer voice
  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowshelf';
  warmth.frequency.value = 220;
  warmth.gain.value = 3;

  // 3. Body: low-mid presence — chest resonance
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 800;
  body.gain.value = 1.5;
  body.Q.value = 0.8;

  // 4. Presence: upper-mid clarity — the "JARVIS articulation"
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3200;
  presence.gain.value = 3;
  presence.Q.value = 1.0;

  // 5. Air: high-shelf shimmer — subtle "digital" quality
  const air = ctx.createBiquadFilter();
  air.type = 'highshelf';
  air.frequency.value = 8000;
  air.gain.value = 1.5;

  // 6. Compressor: controlled dynamics — polished, broadcast-like
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 15;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.12;

  // 7. Merge bus
  const mergeBus = ctx.createGain();
  mergeBus.gain.value = 1;

  // Dry path
  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.82;

  // 8. Micro-reverb — "control room" spatial cue
  const convolver = ctx.createConvolver();
  convolver.buffer = createMicroReverb(ctx);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.20;

  // 9. Stereo micro-delay — electronic width / subtle doubling
  const microDelay = ctx.createDelay();
  microDelay.delayTime.value = 0.012;
  const delayGain = ctx.createGain();
  delayGain.gain.value = 0.10;

  // 10. Output analyser
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.85;

  // Wire: highpass → warmth → body → presence → air → compressor
  highpass.connect(warmth);
  warmth.connect(body);
  body.connect(presence);
  presence.connect(air);
  air.connect(compressor);

  // Dry
  compressor.connect(dryGain);
  dryGain.connect(mergeBus);

  // Reverb send
  compressor.connect(convolver);
  convolver.connect(reverbGain);
  reverbGain.connect(mergeBus);

  // Micro-delay send
  compressor.connect(microDelay);
  microDelay.connect(delayGain);
  delayGain.connect(mergeBus);

  // Output
  mergeBus.connect(analyser);

  return { input: highpass, output: analyser, analyser };
}
