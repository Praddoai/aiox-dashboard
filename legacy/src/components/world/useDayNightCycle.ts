import { useState, useEffect } from 'react';

export interface DayNightState {
  /** 0-1 progress through the day (0 = midnight, 0.5 = noon) */
  progress: number;
  /** Name of current period */
  period: 'night' | 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'evening';
  /** Overlay color + opacity for ambient tinting */
  overlayColor: string;
  overlayOpacity: number;
  /** Window glow intensity (0-1) */
  windowGlow: number;
  /** Floor brightness multiplier (0.7-1.0) */
  floorBrightness: number;
}

function getTimeState(hour: number, minute: number): DayNightState {
  const progress = (hour + minute / 60) / 24;

  // Period-based ambient settings
  if (hour >= 22 || hour < 5) {
    // Night: dark blue overlay
    return {
      progress,
      period: 'night',
      overlayColor: '#0a1628',
      overlayOpacity: 0.25,
      windowGlow: 0.0,
      floorBrightness: 0.75,
    };
  }
  if (hour >= 5 && hour < 7) {
    // Dawn: warm orange tint
    const t = (hour - 5 + minute / 60) / 2;
    return {
      progress,
      period: 'dawn',
      overlayColor: '#FF9F43',
      overlayOpacity: 0.08 * (1 - t),
      windowGlow: t * 0.5,
      floorBrightness: 0.85 + t * 0.1,
    };
  }
  if (hour >= 7 && hour < 12) {
    // Morning: clear, bright
    return {
      progress,
      period: 'morning',
      overlayColor: '#87CEEB',
      overlayOpacity: 0.02,
      windowGlow: 0.6,
      floorBrightness: 1.0,
    };
  }
  if (hour >= 12 && hour < 17) {
    // Afternoon: warm light
    return {
      progress,
      period: 'afternoon',
      overlayColor: '#FFD700',
      overlayOpacity: 0.03,
      windowGlow: 0.8,
      floorBrightness: 1.0,
    };
  }
  if (hour >= 17 && hour < 19) {
    // Dusk: orange/pink tint
    const t = (hour - 17 + minute / 60) / 2;
    return {
      progress,
      period: 'dusk',
      overlayColor: '#FF6B6B',
      overlayOpacity: 0.05 + t * 0.08,
      windowGlow: 0.4 * (1 - t),
      floorBrightness: 0.95 - t * 0.1,
    };
  }
  // Evening: deep blue
  const t = (hour - 19 + minute / 60) / 3;
  return {
    progress,
    period: 'evening',
    overlayColor: '#1a1a4e',
    overlayOpacity: 0.1 + t * 0.12,
    windowGlow: 0.0,
    floorBrightness: 0.8 - t * 0.05,
  };
}

/**
 * Returns current day/night state based on real wall-clock time.
 * Updates every 5 minutes.
 */
export function useDayNightCycle(): DayNightState {
  const [state, setState] = useState<DayNightState>(() => {
    const now = new Date();
    return getTimeState(now.getHours(), now.getMinutes());
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setState(getTimeState(now.getHours(), now.getMinutes()));
    };

    // Update every 5 minutes
    const interval = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
