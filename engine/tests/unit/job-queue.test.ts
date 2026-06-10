import { describe, test, expect } from 'bun:test';

// Test job queue state transitions in isolation

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['running', 'cancelled', 'rejected'],
  running:   ['done', 'failed', 'timeout', 'cancelled'],
  done:      [],
  failed:    ['pending'], // retry
  timeout:   ['pending'], // retry
  rejected:  [],
  cancelled: [],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

describe('Job Queue — State Machine', () => {
  test('pending → running is valid', () => {
    expect(isValidTransition('pending', 'running')).toBe(true);
  });

  test('pending → cancelled is valid', () => {
    expect(isValidTransition('pending', 'cancelled')).toBe(true);
  });

  test('pending → rejected is valid', () => {
    expect(isValidTransition('pending', 'rejected')).toBe(true);
  });

  test('running → done is valid', () => {
    expect(isValidTransition('running', 'done')).toBe(true);
  });

  test('running → failed is valid', () => {
    expect(isValidTransition('running', 'failed')).toBe(true);
  });

  test('running → timeout is valid', () => {
    expect(isValidTransition('running', 'timeout')).toBe(true);
  });

  test('failed → pending is valid (retry)', () => {
    expect(isValidTransition('failed', 'pending')).toBe(true);
  });

  test('timeout → pending is valid (retry)', () => {
    expect(isValidTransition('timeout', 'pending')).toBe(true);
  });

  // Invalid transitions
  test('done → running is invalid', () => {
    expect(isValidTransition('done', 'running')).toBe(false);
  });

  test('cancelled → pending is invalid', () => {
    expect(isValidTransition('cancelled', 'pending')).toBe(false);
  });

  test('rejected → running is invalid', () => {
    expect(isValidTransition('rejected', 'running')).toBe(false);
  });

  test('pending → done is invalid (must go through running)', () => {
    expect(isValidTransition('pending', 'done')).toBe(false);
  });

  test('running → pending is invalid (use failed→pending for retry)', () => {
    expect(isValidTransition('running', 'pending')).toBe(false);
  });

  test('done has no valid transitions (terminal state)', () => {
    const transitions = VALID_TRANSITIONS['done'];
    expect(transitions.length).toBe(0);
  });
});

describe('Job Queue — Priority Ordering', () => {
  test('P0 (urgent) dequeues before P2 (normal)', () => {
    // Simulate priority ordering
    const jobs = [
      { id: 'j1', priority: 2, created_at: '2026-01-01T00:00:01' },
      { id: 'j2', priority: 0, created_at: '2026-01-01T00:00:02' },
      { id: 'j3', priority: 1, created_at: '2026-01-01T00:00:03' },
    ];

    const sorted = [...jobs].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.created_at.localeCompare(b.created_at);
    });

    expect(sorted[0].id).toBe('j2'); // P0 first
    expect(sorted[1].id).toBe('j3'); // P1 second
    expect(sorted[2].id).toBe('j1'); // P2 third
  });

  test('same priority dequeues oldest first (FIFO)', () => {
    const jobs = [
      { id: 'j1', priority: 2, created_at: '2026-01-01T00:00:03' },
      { id: 'j2', priority: 2, created_at: '2026-01-01T00:00:01' },
      { id: 'j3', priority: 2, created_at: '2026-01-01T00:00:02' },
    ];

    const sorted = [...jobs].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.created_at.localeCompare(b.created_at);
    });

    expect(sorted[0].id).toBe('j2'); // Oldest
    expect(sorted[1].id).toBe('j3');
    expect(sorted[2].id).toBe('j1'); // Newest
  });
});
