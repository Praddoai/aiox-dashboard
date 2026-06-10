import { describe, it, expect, vi } from 'vitest';

// Mock the theme module before importing orchestration-types
vi.mock('../../../lib/theme', () => ({
  getSquadInlineStyle: vi.fn((squadId: string) => {
    const styles: Record<string, { bg: string; text: string; border: string; glow: string }> = {
      orchestrator: {
        bg: 'color-mix(in srgb, var(--squad-orchestrator-default) 15%, transparent)',
        text: 'var(--squad-orchestrator-muted)',
        border: 'color-mix(in srgb, var(--squad-orchestrator-default) 30%, transparent)',
        glow: 'color-mix(in srgb, var(--squad-orchestrator-default) 40%, transparent)',
      },
      design: {
        bg: 'color-mix(in srgb, var(--squad-design-default) 15%, transparent)',
        text: 'var(--squad-design-muted)',
        border: 'color-mix(in srgb, var(--squad-design-default) 30%, transparent)',
        glow: 'color-mix(in srgb, var(--squad-design-default) 40%, transparent)',
      },
    };
    return styles[squadId] || {
      bg: 'color-mix(in srgb, var(--squad-default-default) 15%, transparent)',
      text: 'var(--squad-default-muted)',
      border: 'color-mix(in srgb, var(--squad-default-default) 30%, transparent)',
      glow: 'color-mix(in srgb, var(--squad-default-default) 40%, transparent)',
    };
  }),
}));

import {
  phases,
  initialState,
  getSquadColor,
  statusLabel,
  formatDuration,
  formatTimeAgo,
} from '../orchestration-types';
import type { TaskState } from '../orchestration-types';

// ---------------------------------------------------------------------------
// phases
// ---------------------------------------------------------------------------
describe('phases', () => {
  it('has exactly 5 phases', () => {
    expect(phases).toHaveLength(5);
  });

  it('each phase has id, label, icon, and color', () => {
    for (const phase of phases) {
      expect(phase).toHaveProperty('id');
      expect(phase).toHaveProperty('label');
      expect(phase).toHaveProperty('icon');
      expect(phase).toHaveProperty('color');
      expect(typeof phase.id).toBe('string');
      expect(typeof phase.label).toBe('string');
      expect(typeof phase.color).toBe('string');
      // Lucide icons are React.forwardRef components (typeof === 'object')
      expect(phase.icon).toBeDefined();
      expect(typeof phase.icon).toMatch(/function|object/);
    }
  });

  it('contains the expected phase ids in order', () => {
    const ids = phases.map((p) => p.id);
    expect(ids).toEqual(['analyzing', 'planning', 'awaiting_approval', 'executing', 'completed']);
  });

  it('contains distinct colors for each phase', () => {
    const colors = phases.map((p) => p.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

// ---------------------------------------------------------------------------
// initialState
// ---------------------------------------------------------------------------
describe('initialState', () => {
  it('has idle status', () => {
    expect(initialState.status).toBe('idle');
  });

  it('has null taskId', () => {
    expect(initialState.taskId).toBeNull();
  });

  it('has empty demand', () => {
    expect(initialState.demand).toBe('');
  });

  it('has empty arrays', () => {
    expect(initialState.selectedSquads).toEqual([]);
    expect(initialState.squadSelections).toEqual([]);
    expect(initialState.workflowSteps).toEqual([]);
    expect(initialState.agentOutputs).toEqual([]);
    expect(initialState.events).toEqual([]);
  });

  it('has empty streamingOutputs map', () => {
    expect(initialState.streamingOutputs).toBeInstanceOf(Map);
    expect(initialState.streamingOutputs.size).toBe(0);
  });

  it('has null error and startTime', () => {
    expect(initialState.error).toBeNull();
    expect(initialState.startTime).toBeNull();
  });

  it('satisfies the TaskState interface', () => {
    const state: TaskState = initialState;
    expect(state).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getSquadColor
// ---------------------------------------------------------------------------
describe('getSquadColor', () => {
  it('returns style object for a known squad', () => {
    const style = getSquadColor('orchestrator');
    expect(style).toBeDefined();
    expect(style).toHaveProperty('bg');
    expect(style).toHaveProperty('text');
    expect(style).toHaveProperty('border');
    expect(style).toHaveProperty('glow');
  });

  it('returns style object for "design" squad', () => {
    const style = getSquadColor('design');
    expect(style).toBeDefined();
    expect(typeof style.bg).toBe('string');
    expect(typeof style.text).toBe('string');
  });

  it('returns a fallback for an unknown squad', () => {
    const style = getSquadColor('nonexistent-squad');
    expect(style).toBeDefined();
    expect(style).toHaveProperty('bg');
  });
});

// ---------------------------------------------------------------------------
// statusLabel
// ---------------------------------------------------------------------------
describe('statusLabel', () => {
  it('returns correct label for "completed"', () => {
    const result = statusLabel('completed');
    expect(result.label).toBe('Concluído');
    expect(result.color).toContain('green');
  });

  it('returns correct label for "failed"', () => {
    const result = statusLabel('failed');
    expect(result.label).toBe('Falhou');
    expect(result.color).toContain('red');
  });

  it('returns correct label for "executing"', () => {
    const result = statusLabel('executing');
    expect(result.label).toBe('Executando');
    expect(result.color).toContain('orange');
  });

  it('returns correct label for "planning"', () => {
    const result = statusLabel('planning');
    expect(result.label).toBe('Planejando');
    expect(result.color).toContain('purple');
  });

  it('returns correct label for "analyzing"', () => {
    const result = statusLabel('analyzing');
    expect(result.label).toBe('Analisando');
    expect(result.color).toContain('cyan');
  });

  it('returns correct label for "started"', () => {
    const result = statusLabel('started');
    expect(result.label).toBe('Iniciado');
    expect(result.color).toContain('cyan');
  });

  it('returns pending fallback for unknown status', () => {
    const result = statusLabel('whatever');
    expect(result.label).toBe('Pendente');
    expect(result.color).toContain('white');
  });
});

// ---------------------------------------------------------------------------
// formatDuration (orchestration version — milliseconds)
// ---------------------------------------------------------------------------
describe('formatDuration (orchestration)', () => {
  it('formats sub-second as milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats 0ms', () => {
    expect(formatDuration(0)).toBe('0ms');
  });

  it('formats seconds with one decimal', () => {
    expect(formatDuration(2500)).toBe('2.5s');
  });

  it('formats exactly 1 second', () => {
    expect(formatDuration(1000)).toBe('1.0s');
  });

  it('formats minutes and remaining seconds', () => {
    expect(formatDuration(90000)).toBe('1m30s');
  });

  it('formats exactly 1 minute', () => {
    expect(formatDuration(60000)).toBe('1m0s');
  });
});

// ---------------------------------------------------------------------------
// formatTimeAgo
// ---------------------------------------------------------------------------
describe('formatTimeAgo', () => {
  it('returns "agora" for timestamps less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe('agora');
  });

  it('returns minutes for timestamps between 1-59 minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatTimeAgo(fiveMinAgo)).toBe('5min');
  });

  it('returns hours for timestamps between 1-23 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoHoursAgo)).toBe('2h');
  });

  it('returns days for timestamps >= 24 hours ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeDaysAgo)).toBe('3d');
  });
});
