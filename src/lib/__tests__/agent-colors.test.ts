import { describe, it, expect } from 'vitest';
import { AGENT_COLORS, getAgentColor, AGENT_IDS } from '../agent-colors';

describe('agent-colors', () => {
  describe('AGENT_COLORS', () => {
    it('contains all 12 canonical AIOS agents', () => {
      const expected = [
        'aios-master', 'dev', 'qa', 'sm', 'po', 'devops',
        'data-engineer', 'architect', 'pm', 'analyst',
        'ux-design-expert', 'squad-creator',
      ];
      for (const id of expected) {
        expect(AGENT_COLORS).toHaveProperty(id);
      }
    });

    it('all values are valid hex colors', () => {
      for (const color of Object.values(AGENT_COLORS)) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('getAgentColor', () => {
    it('returns the correct color for known agents', () => {
      expect(getAgentColor('dev')).toBe('#0099FF');
      expect(getAgentColor('qa')).toBe('#4ADE80');
      expect(getAgentColor('aios-master')).toBe('#D1FF00');
    });

    it('returns default color for unknown agents', () => {
      expect(getAgentColor('unknown-agent')).toBe('#696969');
      expect(getAgentColor('')).toBe('#696969');
    });
  });

  describe('AGENT_IDS', () => {
    it('has 12 entries', () => {
      expect(AGENT_IDS).toHaveLength(12);
    });

    it('includes all expected agent IDs', () => {
      expect(AGENT_IDS).toContain('dev');
      expect(AGENT_IDS).toContain('aios-master');
      expect(AGENT_IDS).toContain('squad-creator');
    });
  });
});
