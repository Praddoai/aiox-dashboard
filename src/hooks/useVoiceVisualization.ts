import { useState, useRef, useEffect, useCallback } from 'react';

interface VoiceVisualizationResult {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  averageLevel: number;
  peakLevel: number;
}

// Default empty typed arrays to avoid re-creating on every render
const EMPTY_UINT8 = new Uint8Array(0);

export function useVoiceVisualization(
  analyserNode: AnalyserNode | null
): VoiceVisualizationResult {
  const [averageLevel, setAverageLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(EMPTY_UINT8);
  const [timeDomainData, setTimeDomainData] = useState<Uint8Array>(EMPTY_UINT8);

  // Persistent buffers to avoid GC pressure
  const freqBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number>(0);

  const tick = useCallback(function loop() {
    if (!analyserNode) return;

    // Lazily allocate buffers when analyser changes
    const bufferLength = analyserNode.frequencyBinCount;
    if (!freqBufferRef.current || freqBufferRef.current.length !== bufferLength) {
      freqBufferRef.current = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
      timeBufferRef.current = new Uint8Array(analyserNode.fftSize) as Uint8Array<ArrayBuffer>;
    }

    const freqBuf = freqBufferRef.current;
    const timeBuf = timeBufferRef.current!;

    analyserNode.getByteFrequencyData(freqBuf);
    analyserNode.getByteTimeDomainData(timeBuf);

    // Compute average and peak from frequency data
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < freqBuf.length; i++) {
      sum += freqBuf[i];
      if (freqBuf[i] > peak) peak = freqBuf[i];
    }

    const avg = sum / freqBuf.length / 255;
    const pkNorm = peak / 255;

    setAverageLevel(avg);
    setPeakLevel(pkNorm);
    // Expose copies so consumers get a stable snapshot per frame
    setFrequencyData(new Uint8Array(freqBuf));
    setTimeDomainData(new Uint8Array(timeBuf));

    rafRef.current = requestAnimationFrame(loop);
  }, [analyserNode]);

  useEffect(() => {
    if (!analyserNode) {
      // Reset when analyser is disconnected
      setAverageLevel(0);
      setPeakLevel(0);
      setFrequencyData(EMPTY_UINT8);
      setTimeDomainData(EMPTY_UINT8);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [analyserNode, tick]);

  return { frequencyData, timeDomainData, averageLevel, peakLevel };
}
