import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useFocusTrap,
  useAnnounce,
  useFocusReturn,
  useReducedMotion,
  useHighContrast,
  useId,
} from '../useA11y';

describe('useAnnounce', () => {
  it('should create and remove announcement element', async () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current.announce('Test announcement');
    });

    // Check announcement was added
    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toBe('Test announcement');

    // Wait for removal
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const removedAnnouncement = document.querySelector('[role="status"]');
    expect(removedAnnouncement).toBeNull();
  });

  it('should support assertive priority', () => {
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current.announce('Urgent message', 'assertive');
    });

    const announcement = document.querySelector('[aria-live="assertive"]');
    expect(announcement).toBeTruthy();
  });
});

describe('useFocusReturn', () => {
  it('should save and restore focus', () => {
    // Create a focusable element
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { result } = renderHook(() => useFocusReturn());

    // Save current focus
    act(() => {
      result.current.saveFocus();
    });

    // Focus something else
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    expect(document.activeElement).toBe(input);

    // Restore focus
    act(() => {
      result.current.restoreFocus();
    });

    expect(document.activeElement).toBe(button);

    // Cleanup
    document.body.removeChild(button);
    document.body.removeChild(input);
  });
});

describe('useReducedMotion', () => {
  it('should return false when prefers-reduced-motion is not set', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});

describe('useHighContrast', () => {
  it('should return false when prefers-contrast is not set', () => {
    const { result } = renderHook(() => useHighContrast());
    expect(result.current).toBe(false);
  });
});

describe('useId', () => {
  it('should generate unique IDs', () => {
    const { result: result1 } = renderHook(() => useId());
    const { result: result2 } = renderHook(() => useId());

    expect(result1.current).not.toBe(result2.current);
  });

  it('should use custom prefix', () => {
    const { result } = renderHook(() => useId('custom'));

    expect(result.current.startsWith('custom-')).toBe(true);
  });

  it('should return the same ID on re-renders', () => {
    const { result, rerender } = renderHook(() => useId());

    const firstId = result.current;
    rerender();
    const secondId = result.current;

    expect(firstId).toBe(secondId);
  });
});

describe('useFocusTrap', () => {
  it('should return a ref', () => {
    const { result } = renderHook(() => useFocusTrap());

    expect(result.current).toHaveProperty('current');
  });

  it('should not trap focus when inactive', () => {
    const { result } = renderHook(() => useFocusTrap(false));

    // Create container with focusable elements
    const container = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);

    // Set ref
    (result.current as { current: HTMLDivElement | null }).current = container;

    // Focus should not be trapped
    button1.focus();
    expect(document.activeElement).toBe(button1);

    // Cleanup
    document.body.removeChild(container);
  });
});
