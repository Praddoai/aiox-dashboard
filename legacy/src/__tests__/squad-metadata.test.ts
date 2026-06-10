import { describe, expect, it } from 'vitest';
import {
  computeSquadScore,
  formatSquadScore,
  formatSquadVersion,
  hasExplicitSquadVersion,
  normalizeSquadVersion,
  resolveSquadVersion,
  resolveSquadScore,
} from '@/lib/squad-metadata';

describe('squad-metadata', () => {
  it('normalizes unknown versions to v0.0.0', () => {
    expect(hasExplicitSquadVersion('unknown')).toBe(false);
    expect(normalizeSquadVersion('unknown')).toBe('0.0.0');
    expect(formatSquadVersion('unknown')).toBe('v0.0.0');
  });

  it('keeps explicit versions intact', () => {
    expect(hasExplicitSquadVersion('2.1.3')).toBe(true);
    expect(normalizeSquadVersion('2.1.3')).toBe('2.1.3');
    expect(formatSquadVersion('2.1.3')).toBe('v2.1.3');
    expect(resolveSquadVersion('unknown', '2.1.3')).toBe('2.1.3');
  });

  it('computes deterministic fallback score when no candidate exists', () => {
    const score = computeSquadScore({
      agents: 10,
      tasks: 12,
      workflows: 4,
      checklists: 5,
      hasReadme: true,
      hasVersion: true,
    });

    expect(score).toBe(10);
  });

  it('uses provided score candidates before fallback', () => {
    const score = resolveSquadScore(
      ['8.6/10'],
      {
        agents: 0,
        tasks: 0,
        workflows: 0,
        checklists: 0,
        hasReadme: false,
        hasVersion: false,
      }
    );

    expect(score).toBe(8.6);
  });

  it('formats score with one decimal', () => {
    expect(formatSquadScore(8.62)).toBe('8.6');
    expect(formatSquadScore(undefined)).toBe('0.0');
  });
});
