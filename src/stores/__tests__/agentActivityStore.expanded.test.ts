import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAgentActivityStore } from '../agentActivityStore';
import type { MonitorEvent } from '../monitorStore';

describe('agentActivityStore', () => {
  beforeEach(() => {
    vi.useRealTimers();
    useAgentActivityStore.setState({ activities: new Map() });
  });

  function makeEvent(overrides: Partial<MonitorEvent> = {}): MonitorEvent {
    return {
      id: 'evt-1',
      timestamp: Date.now(),
      type: 'tool_call',
      agent: '@dev (Dex)',
      description: 'ToolUse: Read',
      success: true,
      ...overrides,
    };
  }

  // --- processEvent ---

  describe('processEvent', () => {
    it('should add activity from event', () => {
      useAgentActivityStore.getState().processEvent(makeEvent());

      const activities = useAgentActivityStore.getState().activities;
      expect(activities.size).toBe(1);
      expect(activities.get('dex')).toBeDefined();
      expect(activities.get('dex')!.isActive).toBe(true);
    });

    it('should normalize "@dev (Dex)" to "dex"', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: '@dev (Dex)' }));
      expect(useAgentActivityStore.getState().activities.has('dex')).toBe(true);
    });

    it('should normalize "@architect" to "architect"', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: '@architect' }));
      expect(useAgentActivityStore.getState().activities.has('architect')).toBe(true);
    });

    it('should normalize "Dev" to "dev"', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: 'Dev' }));
      expect(useAgentActivityStore.getState().activities.has('dev')).toBe(true);
    });

    it('should ignore system agent', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: 'system' }));
      expect(useAgentActivityStore.getState().activities.size).toBe(0);
    });

    it('should ignore empty agent name', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: '' }));
      expect(useAgentActivityStore.getState().activities.size).toBe(0);
    });

    it('should update existing activity for same agent', () => {
      useAgentActivityStore.getState().processEvent(
        makeEvent({ description: 'ToolUse: Read' })
      );
      useAgentActivityStore.getState().processEvent(
        makeEvent({ description: 'ToolUse: Edit' })
      );

      const activities = useAgentActivityStore.getState().activities;
      expect(activities.size).toBe(1);
      expect(activities.get('dex')!.action).toBe('Editing code...');
    });

    it('should store success flag', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ success: false }));
      expect(useAgentActivityStore.getState().activities.get('dex')!.success).toBe(false);
    });
  });

  // --- Action labels ---

  describe('action label extraction', () => {
    const cases: [string, string][] = [
      ['ToolUse: Read', 'Reading file...'],
      ['ToolUse: Edit', 'Editing code...'],
      ['ToolUse: Write', 'Writing file...'],
      ['ToolUse: Bash', 'Running command...'],
      ['ToolUse: Grep', 'Searching code...'],
      ['ToolUse: Glob', 'Finding files...'],
      ['ToolUse: Agent', 'Spawning agent...'],
      ['ToolUse: WebSearch', 'Searching web...'],
      ['ToolUse: WebFetch', 'Searching web...'],
      ['ToolUse: CustomTool', 'Using CustomTool...'],
    ];

    for (const [desc, expected] of cases) {
      it(`should map "${desc}" → "${expected}"`, () => {
        useAgentActivityStore.getState().processEvent(
          makeEvent({ type: 'tool_call', description: desc })
        );
        expect(useAgentActivityStore.getState().activities.get('dex')!.action).toBe(expected);
      });
    }

    it('should return "Using tool..." for unknown tool_call', () => {
      useAgentActivityStore.getState().processEvent(
        makeEvent({ type: 'tool_call', description: 'something else' })
      );
      expect(useAgentActivityStore.getState().activities.get('dex')!.action).toBe('Using tool...');
    });

    it('should return "Thinking..." for message type', () => {
      useAgentActivityStore.getState().processEvent(
        makeEvent({ type: 'message', description: 'anything' })
      );
      expect(useAgentActivityStore.getState().activities.get('dex')!.action).toBe('Thinking...');
    });

    it('should return "Error encountered" for error type', () => {
      useAgentActivityStore.getState().processEvent(
        makeEvent({ type: 'error', description: 'something broke' })
      );
      expect(useAgentActivityStore.getState().activities.get('dex')!.action).toBe('Error encountered');
    });

    it('should truncate long descriptions for system type', () => {
      const longDesc = 'A'.repeat(50);
      useAgentActivityStore.getState().processEvent(
        makeEvent({ type: 'system' as MonitorEvent['type'], description: longDesc })
      );
      const action = useAgentActivityStore.getState().activities.get('dex')!.action;
      expect(action).toBe('A'.repeat(27) + '...');
    });

    it('should fallback to "Working..." for empty description', () => {
      useAgentActivityStore.getState().processEvent(
        makeEvent({ type: 'system' as MonitorEvent['type'], description: '' })
      );
      expect(useAgentActivityStore.getState().activities.get('dex')!.action).toBe('Working...');
    });
  });

  // --- Tool name extraction ---

  describe('tool name extraction', () => {
    it('should extract tool name from "ToolUse: Read"', () => {
      useAgentActivityStore.getState().processEvent(
        makeEvent({ description: 'ToolUse: Read' })
      );
      expect(useAgentActivityStore.getState().activities.get('dex')!.tool).toBe('Read');
    });

    it('should extract tool name from "tool_call: CustomTool"', () => {
      useAgentActivityStore.getState().processEvent(
        makeEvent({ description: 'tool_call: CustomTool' })
      );
      expect(useAgentActivityStore.getState().activities.get('dex')!.tool).toBe('CustomTool');
    });

    it('should return undefined when no tool pattern matches', () => {
      useAgentActivityStore.getState().processEvent(
        makeEvent({ type: 'message', description: 'just thinking' })
      );
      expect(useAgentActivityStore.getState().activities.get('dex')!.tool).toBeUndefined();
    });
  });

  // --- getActivity ---

  describe('getActivity', () => {
    it('should find activity by exact normalized name', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: '@dev (Dex)' }));

      const activity = useAgentActivityStore.getState().getActivity('dex');
      expect(activity).toBeDefined();
      expect(activity!.agentName).toBe('@dev (Dex)');
    });

    it('should find activity by partial match (includes)', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: '@architect (Aria)' }));

      // "aria" includes "ari"
      const activity = useAgentActivityStore.getState().getActivity('aria');
      expect(activity).toBeDefined();
    });

    it('should find activity from parenthesized name format', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: '@qa (Quill)' }));

      const activity = useAgentActivityStore.getState().getActivity('@qa (Quill)');
      expect(activity).toBeDefined();
    });

    it('should return undefined for unknown agent', () => {
      const activity = useAgentActivityStore.getState().getActivity('unknown');
      expect(activity).toBeUndefined();
    });
  });

  // --- Auto-deactivate ---

  describe('auto-deactivate', () => {
    it('should deactivate after 8 seconds', () => {
      vi.useFakeTimers();

      useAgentActivityStore.getState().processEvent(makeEvent());
      expect(useAgentActivityStore.getState().activities.get('dex')!.isActive).toBe(true);

      vi.advanceTimersByTime(8000);
      expect(useAgentActivityStore.getState().activities.get('dex')!.isActive).toBe(false);
    });

    it('should NOT deactivate if a newer event arrived', () => {
      vi.useFakeTimers();

      useAgentActivityStore.getState().processEvent(makeEvent());

      // Advance 5s, then new event
      vi.advanceTimersByTime(5000);
      useAgentActivityStore.getState().processEvent(
        makeEvent({ description: 'ToolUse: Edit' })
      );

      // Advance to 8s from first event — should NOT deactivate because timestamp changed
      vi.advanceTimersByTime(3000);
      expect(useAgentActivityStore.getState().activities.get('dex')!.isActive).toBe(true);

      // Advance to 8s from second event
      vi.advanceTimersByTime(5000);
      expect(useAgentActivityStore.getState().activities.get('dex')!.isActive).toBe(false);
    });
  });

  // --- clearStale ---

  describe('clearStale', () => {
    it('should remove activities older than 15 seconds', () => {
      vi.useFakeTimers();

      useAgentActivityStore.getState().processEvent(makeEvent({ agent: 'OldAgent' }));

      vi.advanceTimersByTime(16000);

      useAgentActivityStore.getState().processEvent(makeEvent({ agent: 'NewAgent' }));
      useAgentActivityStore.getState().clearStale();

      const activities = useAgentActivityStore.getState().activities;
      expect(activities.has('oldagent')).toBe(false);
      expect(activities.has('newagent')).toBe(true);
    });

    it('should keep activities within threshold', () => {
      vi.useFakeTimers();

      useAgentActivityStore.getState().processEvent(makeEvent({ agent: 'Fresh' }));
      vi.advanceTimersByTime(5000);

      useAgentActivityStore.getState().clearStale();
      expect(useAgentActivityStore.getState().activities.has('fresh')).toBe(true);
    });

    it('should handle empty activities', () => {
      useAgentActivityStore.getState().clearStale();
      expect(useAgentActivityStore.getState().activities.size).toBe(0);
    });
  });

  // --- Multiple agents ---

  describe('multiple agents', () => {
    it('should track multiple agents independently', () => {
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: '@dev (Dex)' }));
      useAgentActivityStore.getState().processEvent(makeEvent({ agent: '@qa (Quill)', type: 'message' }));

      const activities = useAgentActivityStore.getState().activities;
      expect(activities.size).toBe(2);
      expect(activities.get('dex')!.action).toBe('Reading file...');
      expect(activities.get('quill')!.action).toBe('Thinking...');
    });
  });
});
