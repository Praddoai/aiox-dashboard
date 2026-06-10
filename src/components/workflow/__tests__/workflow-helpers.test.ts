import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatDuration,
  formatElapsedTime,
  stepStatusToNodeStatus,
  stepStatusToEdgeStatus,
} from '../workflow-execution-helpers';
import {
  STEP_TYPE_LABELS,
  SQUAD_STYLES,
  getSquadStyle,
  STEP_TYPE_TO_SQUAD,
} from '../workflow-execution-constants';

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------
describe('formatDuration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty string when startedAt is undefined', () => {
    expect(formatDuration(undefined, undefined)).toBe('');
  });

  it('returns empty string when startedAt is not provided but completedAt is', () => {
    expect(formatDuration(undefined, '2025-01-01T00:01:00Z')).toBe('');
  });

  it('computes duration in seconds when < 60s', () => {
    const start = '2025-01-01T00:00:00Z';
    const end = '2025-01-01T00:00:30Z';
    expect(formatDuration(start, end)).toBe('30s');
  });

  it('returns 0s for identical start and end', () => {
    const ts = '2025-01-01T00:00:00Z';
    expect(formatDuration(ts, ts)).toBe('0s');
  });

  it('computes duration in minutes and seconds when >= 60s', () => {
    const start = '2025-01-01T00:00:00Z';
    const end = '2025-01-01T00:02:15Z';
    expect(formatDuration(start, end)).toBe('2m 15s');
  });

  it('computes exactly 1m 0s for 60 seconds', () => {
    const start = '2025-01-01T00:00:00Z';
    const end = '2025-01-01T00:01:00Z';
    expect(formatDuration(start, end)).toBe('1m 0s');
  });

  it('uses Date.now() when completedAt is not provided', () => {
    const fakeNow = new Date('2025-06-01T00:00:45Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(fakeNow);
    const start = '2025-06-01T00:00:00Z';
    expect(formatDuration(start)).toBe('45s');
  });

  it('handles large durations (hours)', () => {
    const start = '2025-01-01T00:00:00Z';
    const end = '2025-01-01T01:30:00Z'; // 90 minutes
    expect(formatDuration(start, end)).toBe('90m 0s');
  });
});

// ---------------------------------------------------------------------------
// formatElapsedTime
// ---------------------------------------------------------------------------
describe('formatElapsedTime', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatElapsedTime(0)).toBe('00:00');
  });

  it('formats single-digit seconds with leading zero', () => {
    expect(formatElapsedTime(5)).toBe('00:05');
  });

  it('formats 59 seconds as 00:59', () => {
    expect(formatElapsedTime(59)).toBe('00:59');
  });

  it('formats 60 seconds as 01:00', () => {
    expect(formatElapsedTime(60)).toBe('01:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(formatElapsedTime(90)).toBe('01:30');
  });

  it('formats 3600 seconds as 60:00', () => {
    expect(formatElapsedTime(3600)).toBe('60:00');
  });

  it('formats 3661 seconds as 61:01', () => {
    expect(formatElapsedTime(3661)).toBe('61:01');
  });
});

// ---------------------------------------------------------------------------
// stepStatusToNodeStatus
// ---------------------------------------------------------------------------
describe('stepStatusToNodeStatus', () => {
  it('maps "completed" to "completed"', () => {
    expect(stepStatusToNodeStatus('completed')).toBe('completed');
  });

  it('maps "running" to "active"', () => {
    expect(stepStatusToNodeStatus('running')).toBe('active');
  });

  it('maps "failed" to "error"', () => {
    expect(stepStatusToNodeStatus('failed')).toBe('error');
  });

  it('maps "pending" to "idle" (default)', () => {
    expect(stepStatusToNodeStatus('pending')).toBe('idle');
  });

  it('maps any unknown status to "idle"', () => {
    // Force an unknown value via type assertion for robustness
    expect(stepStatusToNodeStatus('unknown' as 'pending')).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// stepStatusToEdgeStatus
// ---------------------------------------------------------------------------
describe('stepStatusToEdgeStatus', () => {
  it('maps "completed" to "completed"', () => {
    expect(stepStatusToEdgeStatus('completed')).toBe('completed');
  });

  it('maps "running" to "active"', () => {
    expect(stepStatusToEdgeStatus('running')).toBe('active');
  });

  it('maps "pending" to "idle" (default)', () => {
    expect(stepStatusToEdgeStatus('pending')).toBe('idle');
  });

  it('maps "failed" to "idle" (default)', () => {
    expect(stepStatusToEdgeStatus('failed')).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// STEP_TYPE_LABELS
// ---------------------------------------------------------------------------
describe('STEP_TYPE_LABELS', () => {
  const expectedKeys = [
    'task',
    'condition',
    'parallel',
    'loop',
    'wait',
    'subworkflow',
    'webhook',
    'transform',
  ];

  it.each(expectedKeys)('contains label for "%s"', (key) => {
    expect(STEP_TYPE_LABELS[key]).toBeDefined();
    expect(typeof STEP_TYPE_LABELS[key]).toBe('string');
    expect(STEP_TYPE_LABELS[key].length).toBeGreaterThan(0);
  });

  it('has exactly 8 entries', () => {
    expect(Object.keys(STEP_TYPE_LABELS)).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// STEP_TYPE_TO_SQUAD
// ---------------------------------------------------------------------------
describe('STEP_TYPE_TO_SQUAD', () => {
  const expectedMappings: Record<string, string> = {
    task: 'orchestrator',
    condition: 'design',
    parallel: 'creator',
    loop: 'copywriting',
    wait: 'orchestrator',
    subworkflow: 'design',
    webhook: 'creator',
    transform: 'copywriting',
  };

  it.each(Object.entries(expectedMappings))(
    'maps step type "%s" to squad "%s"',
    (stepType, squad) => {
      expect(STEP_TYPE_TO_SQUAD[stepType]).toBe(squad);
    }
  );

  it('has exactly 8 entries', () => {
    expect(Object.keys(STEP_TYPE_TO_SQUAD)).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// SQUAD_STYLES & getSquadStyle
// ---------------------------------------------------------------------------
describe('SQUAD_STYLES', () => {
  const requiredKeys = ['gradient', 'border', 'bg', 'text', 'glow'];

  it.each(['copywriting', 'design', 'creator', 'orchestrator', 'default'])(
    'squad "%s" has all required style keys',
    (squad) => {
      const style = SQUAD_STYLES[squad];
      expect(style).toBeDefined();
      for (const key of requiredKeys) {
        expect(style).toHaveProperty(key);
        expect(typeof style[key as keyof typeof style]).toBe('string');
      }
    }
  );
});

describe('getSquadStyle', () => {
  it('returns style for a known squad', () => {
    const style = getSquadStyle('orchestrator');
    expect(style).toBe(SQUAD_STYLES.orchestrator);
  });

  it('returns style for another known squad', () => {
    expect(getSquadStyle('copywriting')).toBe(SQUAD_STYLES.copywriting);
  });

  it('returns default style for an unknown squad', () => {
    expect(getSquadStyle('nonexistent-squad')).toBe(SQUAD_STYLES.default);
  });

  it('returns default style when squad is undefined', () => {
    expect(getSquadStyle(undefined)).toBe(SQUAD_STYLES.default);
  });

  it('returns default style when squad is empty string', () => {
    expect(getSquadStyle('')).toBe(SQUAD_STYLES.default);
  });
});
