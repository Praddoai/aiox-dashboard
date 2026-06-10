/**
 * Canonical AIOS agent color mapping — brandbook-aligned.
 *
 * Single source of truth for agent badge/node colors across the dashboard.
 * Import this instead of defining per-component AGENT_COLORS constants.
 */

export const AGENT_COLORS: Record<string, string> = {
  'aios-master': '#D1FF00',
  dev: '#0099FF',
  qa: '#4ADE80',
  sm: '#f59e0b',
  po: '#ED4609',
  devops: '#8B5CF6',
  'data-engineer': '#3DB2FF',
  architect: '#D1FF00',
  pm: '#BDBDBD',
  analyst: '#999999',
  'ux-design-expert': '#a8cc00',
  'squad-creator': '#696969',
};

const DEFAULT_COLOR = '#696969';

/** Get the color for an agent ID, with fallback. */
export function getAgentColor(agentId: string): string {
  return AGENT_COLORS[agentId] || DEFAULT_COLOR;
}

/** All known agent IDs. */
export const AGENT_IDS = Object.keys(AGENT_COLORS);
