import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/safeStorage', () => ({
  safePersistStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
}));

import { useSettingsStore } from '../settingsStore';

const DEFAULT_AGENT_COLORS = [
  { id: 'dev', label: 'Dev', color: '#22c55e' },
  { id: 'qa', label: 'QA', color: '#a855f7' },
  { id: 'architect', label: 'Architect', color: '#3b82f6' },
  { id: 'pm', label: 'PM', color: '#f97316' },
  { id: 'po', label: 'PO', color: '#ec4899' },
  { id: 'analyst', label: 'Analyst', color: '#06b6d4' },
  { id: 'devops', label: 'DevOps', color: '#eab308' },
];

const defaultState = {
  autoRefresh: true,
  refreshInterval: 30,
  storiesPath: 'docs/stories',
  agentColors: DEFAULT_AGENT_COLORS,
};

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState(defaultState);
  });

  it('should have correct default values', () => {
    const state = useSettingsStore.getState();
    expect(state.autoRefresh).toBe(true);
    expect(state.refreshInterval).toBe(30);
    expect(state.storiesPath).toBe('docs/stories');
    expect(state.agentColors).toHaveLength(7);
  });

  it('should set autoRefresh to false', () => {
    useSettingsStore.getState().setAutoRefresh(false);
    expect(useSettingsStore.getState().autoRefresh).toBe(false);
  });

  it('should set autoRefresh to true', () => {
    useSettingsStore.setState({ autoRefresh: false });
    useSettingsStore.getState().setAutoRefresh(true);
    expect(useSettingsStore.getState().autoRefresh).toBe(true);
  });

  it('should set refreshInterval', () => {
    useSettingsStore.getState().setRefreshInterval(60);
    expect(useSettingsStore.getState().refreshInterval).toBe(60);
  });

  it('should set storiesPath', () => {
    useSettingsStore.getState().setStoriesPath('custom/path');
    expect(useSettingsStore.getState().storiesPath).toBe('custom/path');
  });

  it('should update a specific agent color', () => {
    useSettingsStore.getState().setAgentColor('dev', '#ff0000');
    const devAgent = useSettingsStore
      .getState()
      .agentColors.find((a) => a.id === 'dev');
    expect(devAgent?.color).toBe('#ff0000');
  });

  it('should not modify other agent colors when updating one', () => {
    useSettingsStore.getState().setAgentColor('dev', '#ff0000');
    const qaAgent = useSettingsStore
      .getState()
      .agentColors.find((a) => a.id === 'qa');
    expect(qaAgent?.color).toBe('#a855f7');
  });

  it('should reset all settings to defaults', () => {
    useSettingsStore.getState().setAutoRefresh(false);
    useSettingsStore.getState().setRefreshInterval(120);
    useSettingsStore.getState().setStoriesPath('other/path');
    useSettingsStore.getState().setAgentColor('dev', '#ff0000');

    useSettingsStore.getState().resetToDefaults();
    const state = useSettingsStore.getState();
    expect(state.autoRefresh).toBe(true);
    expect(state.refreshInterval).toBe(30);
    expect(state.storiesPath).toBe('docs/stories');
    expect(state.agentColors.find((a) => a.id === 'dev')?.color).toBe(
      '#22c55e'
    );
  });
});
