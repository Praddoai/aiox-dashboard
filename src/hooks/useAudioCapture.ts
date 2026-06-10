import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioCaptureResult {
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  analyserNode: AnalyserNode | null;
  isCapturing: boolean;
  inputLevel: number;
}

export function useAudioCapture(deviceId?: string | null): AudioCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const computeLevel = useCallback(function loop() {
    const analyser = analyserRef.current;
    if (!analyser || !dataArrayRef.current) return;

    analyser.getByteTimeDomainData(dataArrayRef.current);

    // Compute RMS normalized to 0-1
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const sample = (dataArrayRef.current[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / dataArrayRef.current.length);
    // Scale up for better visual response (raw RMS is typically very low)
    const level = Math.min(1, rms * 4);

    setInputLevel(level);
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const startCapture = useCallback(async () => {
    try {
      const audioConstraints: MediaTrackConstraints | true = deviceId
        ? { deviceId: { exact: deviceId } }
        : true;
      console.log('[AudioCapture] Requesting getUserMedia...', { deviceId: deviceId || 'default' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      console.log('[AudioCapture] Got stream:', stream.getAudioTracks().map(t => t.label));
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      analyserRef.current = analyser;
      setAnalyserNode(analyser);
      dataArrayRef.current = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;

      setIsCapturing(true);
      rafRef.current = requestAnimationFrame(computeLevel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to capture audio';
      throw new Error(msg);
    }
  }, [computeLevel, deviceId]);

  const stopCapture = useCallback(() => {
    // Cancel animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
    setAnalyserNode(null);
    dataArrayRef.current = null;
    setIsCapturing(false);
    setInputLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      audioContextRef.current?.close().catch(() => {});
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { startCapture, stopCapture, analyserNode, isCapturing, inputLevel };
}
