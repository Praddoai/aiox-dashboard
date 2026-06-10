import { useEffect, useRef } from 'react';

interface UseKeyboardNavOptions {
  /** Called each animation frame with pan delta (in pixels) */
  onPan: (dx: number, dy: number) => void;
  /** Pan speed in pixels per frame */
  panSpeed?: number;
  /** Called when Escape is pressed */
  onEscape?: () => void;
  /** Whether keyboard nav is active */
  enabled?: boolean;
}

/**
 * Hook for WASD / Arrow key camera panning within a room view.
 * Uses requestAnimationFrame for smooth continuous movement.
 * Also supports Escape for back navigation.
 */
export function useKeyboardNav({
  onPan,
  panSpeed = 6,
  onEscape,
  enabled = true,
}: UseKeyboardNavOptions) {
  const keysDown = useRef(new Set<string>());
  const rafRef = useRef<number | null>(null);
  const onPanRef = useRef(onPan);
  onPanRef.current = onPan;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      let dx = 0;
      let dy = 0;

      // WASD / Arrows: pan the camera (translate the room)
      if (keysDown.current.has('arrowleft') || keysDown.current.has('a')) dx += panSpeed;
      if (keysDown.current.has('arrowright') || keysDown.current.has('d')) dx -= panSpeed;
      if (keysDown.current.has('arrowup') || keysDown.current.has('w')) dy += panSpeed;
      if (keysDown.current.has('arrowdown') || keysDown.current.has('s')) dy -= panSpeed;

      if (dx !== 0 || dy !== 0) {
        onPanRef.current(dx, dy);
      }

      if (keysDown.current.size > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();

      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        keysDown.current.add(key);
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }

      if (key === 'escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysDown.current.delete(key);
      if (keysDown.current.size === 0 && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    // Clear all on blur (prevent stuck keys)
    const handleBlur = () => {
      keysDown.current.clear();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, panSpeed, onEscape]);
}
