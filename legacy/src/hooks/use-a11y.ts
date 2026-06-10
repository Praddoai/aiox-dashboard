'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing focus trap within a container
 * Useful for modals, dialogs, and dropdown menus
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
}

/**
 * Hook for keyboard navigation in lists
 */
export function useListNavigation<T>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  options: {
    loop?: boolean;
    orientation?: 'vertical' | 'horizontal';
  } = {}
) {
  const { loop = true, orientation = 'vertical' } = options;
  const activeIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

      let newIndex = activeIndexRef.current;

      switch (e.key) {
        case prevKey:
          e.preventDefault();
          newIndex = activeIndexRef.current - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
          break;
        case nextKey:
          e.preventDefault();
          newIndex = activeIndexRef.current + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(items[activeIndexRef.current], activeIndexRef.current);
          return;
        default:
          return;
      }

      activeIndexRef.current = newIndex;
      onSelect(items[newIndex], newIndex);
    },
    [items, onSelect, loop, orientation]
  );

  const setActiveIndex = useCallback((index: number) => {
    activeIndexRef.current = index;
  }, []);

  return {
    handleKeyDown,
    activeIndex: activeIndexRef.current,
    setActiveIndex,
  };
}

/**
 * Hook for restoring focus when a modal/overlay closes
 */
export function useFocusReturn() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * Hook for detecting reduced motion preference
 */
export function useReducedMotion(): boolean {
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  return mediaQuery?.matches ?? false;
}

/**
 * Hook for detecting high contrast mode
 */
export function useHighContrast(): boolean {
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-contrast: more)')
    : null;

  return mediaQuery?.matches ?? false;
}

/**
 * Generate unique IDs for ARIA attributes
 */
let idCounter = 0;
export function useId(prefix: string = 'id'): string {
  const idRef = useRef<string | null>(null);

  if (idRef.current === null) {
    idRef.current = `${prefix}-${++idCounter}`;
  }

  return idRef.current;
}

/**
 * Hook for managing skip links
 */
export function useSkipLinks() {
  const skipToMain = useCallback(() => {
    const main = document.querySelector('main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
      main.removeAttribute('tabindex');
    }
  }, []);

  const skipToNav = useCallback(() => {
    const nav = document.querySelector('nav');
    if (nav) {
      const firstLink = nav.querySelector('a, button');
      (firstLink as HTMLElement)?.focus();
    }
  }, []);

  return { skipToMain, skipToNav };
}
