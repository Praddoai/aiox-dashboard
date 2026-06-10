import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// We need to reset the module-level `soundEnabled` between tests,
// so we use dynamic import with resetModules.
let useSound: typeof import('../useSound').useSound;
let playSound: typeof import('../useSound').playSound;

// Minimal AudioContext mock
function createAudioContextMock() {
  const _gainNode = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const oscillatorNode = {
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  return {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => ({ ...oscillatorNode })),
    createGain: vi.fn(() => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
    close: vi.fn(),
  };
}

describe('useSound', () => {
  let mockAudioCtx: ReturnType<typeof createAudioContextMock>;

  beforeEach(async () => {
    vi.resetModules();

    mockAudioCtx = createAudioContextMock();

    // Clear cached context on window BEFORE module loads
    const win = window as unknown as Record<string, unknown>;
    delete win.__aiosSoundCtx;

    // Set the cached context directly so the module's audioCtx() finds it
    win.__aiosSoundCtx = mockAudioCtx;

    // Also stub the constructor in case it creates a new one
    vi.stubGlobal('AudioContext', function MockAudioContext() {
      return mockAudioCtx;
    });

    // Re-import to get fresh module state (soundEnabled = true)
    const mod = await import('../useSound');
    useSound = mod.useSound;
    playSound = mod.playSound;
  });

  it('should return play, toggle, and enabled', () => {
    const { result } = renderHook(() => useSound());

    expect(typeof result.current.play).toBe('function');
    expect(typeof result.current.toggle).toBe('function');
    expect(result.current.enabled).toBe(true);
  });

  it('should play a sound when enabled', () => {
    const { result } = renderHook(() => useSound());

    result.current.play('navigate');

    // The oscillator should have been created and started
    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
  });

  it('should not play a sound when disabled', () => {
    const { result } = renderHook(() => useSound());

    // Disable
    result.current.toggle();

    // Reset mock counts
    mockAudioCtx.createOscillator.mockClear();

    result.current.play('navigate');

    expect(mockAudioCtx.createOscillator).not.toHaveBeenCalled();
  });

  it('toggle should flip enabled state and back', () => {
    const { result } = renderHook(() => useSound());

    expect(result.current.enabled).toBe(true);

    const disabled = result.current.toggle();
    expect(disabled).toBe(false);

    const reEnabled = result.current.toggle();
    expect(reEnabled).toBe(true);
  });

  it('playSound standalone function should work', () => {
    playSound('success');

    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
  });

  it('should not throw when AudioContext throws', () => {
    // Make createOscillator throw
    mockAudioCtx.createOscillator.mockImplementation(() => {
      throw new Error('AudioContext unavailable');
    });

    const { result } = renderHook(() => useSound());

    // play should swallow the error gracefully
    expect(() => result.current.play('error')).not.toThrow();
  });
});
