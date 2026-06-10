import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../monitorStore', () => ({
  useMonitorStore: {
    subscribe: vi.fn(),
    getState: vi.fn().mockReturnValue({ events: [] }),
  },
}));

import { useAgentActivityStore } from '../agentActivityStore';
import type { MonitorEvent } from '../monitorStore';

const makeEvent = (agent: string, type: string, description: string): MonitorEvent => ({
  id: 'e1',
  timestamp: new Date().toISOString(),
  type: type as MonitorEvent['type'],
  agent,
  description,
  success: true,
});

function resetStore() {
  useAgentActivityStore.setState({ activities: new Map() });
}

describe('agentActivityStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have empty activities initially', () => {
    expect(useAgentActivityStore.getState().activities.size).toBe(0);
  });

  it('processEvent should add activity to the map', () => {
    const event = makeEvent('dev', 'tool_call', 'ToolUse: Read');
    useAgentActivityStore.getState().processEvent(event);

    expect(useAgentActivityStore.getState().activities.size).toBe(1);
    expect(useAgentActivityStore.getState().activities.has('dev')).toBe(true);
  });

  it('processEvent should normalize "@dev (Dex)" to "dex"', () => {
    const event = makeEvent('@dev (Dex)', 'tool_call', 'ToolUse: Read');
    useAgentActivityStore.getState().processEvent(event);

    expect(useAgentActivityStore.getState().activities.has('dex')).toBe(true);
  });

  it('processEvent should extract action label "Reading file..." for Read tool', () => {
    const event = makeEvent('dev', 'tool_call', 'ToolUse: Read');
    useAgentActivityStore.getState().processEvent(event);

    const activity = useAgentActivityStore.getState().activities.get('dev');
    expect(activity?.action).toBe('Reading file...');
  });

  it('processEvent should extract action label "Editing code..." for Edit tool', () => {
    const event = makeEvent('dev', 'tool_call', 'ToolUse: Edit');
    useAgentActivityStore.getState().processEvent(event);

    const activity = useAgentActivityStore.getState().activities.get('dev');
    expect(activity?.action).toBe('Editing code...');
  });

  it('processEvent should extract action label "Thinking..." for message type', () => {
    const event = makeEvent('dev', 'message', 'Some message');
    useAgentActivityStore.getState().processEvent(event);

    const activity = useAgentActivityStore.getState().activities.get('dev');
    expect(activity?.action).toBe('Thinking...');
  });

  it('processEvent should ignore system agent', () => {
    const event = makeEvent('system', 'system', 'System event');
    useAgentActivityStore.getState().processEvent(event);

    expect(useAgentActivityStore.getState().activities.size).toBe(0);
  });

  it('processEvent should extract tool name from description', () => {
    const event = makeEvent('dev', 'tool_call', 'ToolUse: Grep');
    useAgentActivityStore.getState().processEvent(event);

    const activity = useAgentActivityStore.getState().activities.get('dev');
    expect(activity?.tool).toBe('Grep');
  });

  it('getActivity should find by normalized name', () => {
    const event = makeEvent('Dev', 'tool_call', 'ToolUse: Read');
    useAgentActivityStore.getState().processEvent(event);

    const activity = useAgentActivityStore.getState().getActivity('dev');
    expect(activity).toBeDefined();
    expect(activity?.action).toBe('Reading file...');
  });

  it('getActivity should fuzzy match partial names', () => {
    const event = makeEvent('@dev (Dex)', 'tool_call', 'ToolUse: Read');
    useAgentActivityStore.getState().processEvent(event);

    // "dex" is stored; searching "de" should match via includes
    const activity = useAgentActivityStore.getState().getActivity('dex');
    expect(activity).toBeDefined();
  });

  it('getActivity should return undefined for unknown agent', () => {
    const activity = useAgentActivityStore.getState().getActivity('unknown');
    expect(activity).toBeUndefined();
  });

  it('clearStale should remove activities older than 15 seconds', () => {
    const event = makeEvent('dev', 'tool_call', 'ToolUse: Read');
    useAgentActivityStore.getState().processEvent(event);

    // Manually set the timestamp to 20 seconds ago
    const activities = new Map(useAgentActivityStore.getState().activities);
    const activity = activities.get('dev')!;
    activities.set('dev', { ...activity, timestamp: Date.now() - 20_000 });
    useAgentActivityStore.setState({ activities });

    // Add a recent activity for another agent
    const recentEvent = makeEvent('qa', 'tool_call', 'ToolUse: Bash');
    useAgentActivityStore.getState().processEvent(recentEvent);

    useAgentActivityStore.getState().clearStale();

    expect(useAgentActivityStore.getState().activities.has('dev')).toBe(false);
    expect(useAgentActivityStore.getState().activities.has('qa')).toBe(true);
  });

  it('clearStale should keep recent activities', () => {
    const event = makeEvent('dev', 'tool_call', 'ToolUse: Read');
    useAgentActivityStore.getState().processEvent(event);

    useAgentActivityStore.getState().clearStale();

    expect(useAgentActivityStore.getState().activities.has('dev')).toBe(true);
  });
});
