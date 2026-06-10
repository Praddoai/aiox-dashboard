import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock connection module before importing the store
vi.mock('../../lib/connection', () => ({
  getConnectionConfig: vi.fn().mockReturnValue({
    mode: 'local',
    wsUrl: 'ws://localhost:4001/stream',
    httpUrl: 'http://localhost:4001',
    roomId: null,
    token: null,
  }),
}));

import { useMonitorStore, type MonitorEvent } from '../monitorStore';
import { getConnectionConfig } from '../../lib/connection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<MonitorEvent> = {}): MonitorEvent {
  return {
    id: 'evt-1',
    timestamp: new Date().toISOString(),
    type: 'tool_call',
    agent: 'dev',
    description: 'Test',
    success: true,
    ...overrides,
  };
}

function makeAlert(overrides: Partial<MonitorEvent & { id: string; message: string; severity: 'info' | 'warning' | 'error'; dismissed: boolean }> = {}) {
  return {
    id: 'a1',
    message: 'Alert',
    severity: 'warning' as const,
    timestamp: new Date().toISOString(),
    dismissed: false,
    ...overrides,
  };
}

function resetStore() {
  useMonitorStore.setState({
    connected: false,
    connectionMode: 'local',
    roomId: null,
    cliConnected: false,
    events: [],
    currentTool: null,
    stats: { total: 0, successRate: 100, errorCount: 0, activeSessions: 0 },
    metrics: { cpu: 0, memory: 0, latency: 0, throughput: 0 },
    alerts: [],
    eventFilters: new Set(),
  });
}

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  readyState = 0; // CONNECTING
  close = vi.fn(() => {
    this.readyState = 3; // CLOSED
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  // Simulate the server opening the connection
  simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) this.onopen(new Event('open'));
  }

  // Simulate the server sending a message
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  // Simulate connection close
  simulateClose() {
    this.readyState = 3;
    if (this.onclose) this.onclose(new CloseEvent('close'));
  }

  // Simulate an error
  simulateError() {
    if (this.onerror) this.onerror(new Event('error'));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('monitorStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    MockWebSocket.instances = [];
  });

  // =========================================================================
  // Initial State
  // =========================================================================

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useMonitorStore.getState();
      expect(state.connected).toBe(false);
      expect(state.connectionMode).toBe('local');
      expect(state.roomId).toBeNull();
      expect(state.cliConnected).toBe(false);
      expect(state.events).toEqual([]);
      expect(state.currentTool).toBeNull();
      expect(state.stats).toEqual({
        total: 0,
        successRate: 100,
        errorCount: 0,
        activeSessions: 0,
      });
      expect(state.metrics).toEqual({ cpu: 0, memory: 0, latency: 0, throughput: 0 });
      expect(state.alerts).toEqual([]);
      expect(state.eventFilters).toBeInstanceOf(Set);
      expect(state.eventFilters.size).toBe(0);
    });
  });

  // =========================================================================
  // addEvent
  // =========================================================================

  describe('addEvent', () => {
    it('should append a single event', () => {
      const event = makeEvent({ id: 'evt-1' });
      useMonitorStore.getState().addEvent(event);

      const state = useMonitorStore.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].id).toBe('evt-1');
    });

    it('should update stats.total to match event count', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2', type: 'message' }));

      expect(useMonitorStore.getState().stats.total).toBe(2);
    });

    it('should cap events at 50 (ring buffer)', () => {
      for (let i = 0; i < 55; i++) {
        useMonitorStore.getState().addEvent(makeEvent({ id: `evt-${i}` }));
      }

      const state = useMonitorStore.getState();
      expect(state.events).toHaveLength(50);
      // Oldest 5 events should have been evicted
      expect(state.events[0].id).toBe('evt-5');
      expect(state.events[49].id).toBe('evt-54');
    });

    it('should count errors correctly', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'error' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2', type: 'tool_call' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e3', type: 'error' }));

      expect(useMonitorStore.getState().stats.errorCount).toBe(2);
    });

    it('should calculate successRate from tool_call events only', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'tool_call', success: true }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2', type: 'tool_call', success: true }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e3', type: 'tool_call', success: false }));
      // message events should not affect tool_call success rate
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e4', type: 'message', success: true }));

      const state = useMonitorStore.getState();
      // 3 tool_call events, 2 successful => Math.round(2/3 * 100) = 67
      expect(state.stats.successRate).toBe(67);
    });

    it('should return 100 successRate when no tool_call events exist', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'message' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2', type: 'system' }));

      expect(useMonitorStore.getState().stats.successRate).toBe(100);
    });

    it('should return 0 successRate when all tool_calls fail', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'tool_call', success: false }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2', type: 'tool_call', success: false }));

      expect(useMonitorStore.getState().stats.successRate).toBe(0);
    });

    it('should return 100 successRate when all tool_calls succeed', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'tool_call', success: true }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2', type: 'tool_call', success: true }));

      expect(useMonitorStore.getState().stats.successRate).toBe(100);
    });

    it('should handle tool_call with undefined success (not counted as successful)', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'tool_call', success: undefined }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2', type: 'tool_call', success: true }));

      // 2 tool_calls, 1 successful => 50%
      expect(useMonitorStore.getState().stats.successRate).toBe(50);
    });

    it('should preserve activeSessions across addEvent calls', () => {
      useMonitorStore.setState((state) => ({
        stats: { ...state.stats, activeSessions: 3 },
      }));

      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1' }));

      expect(useMonitorStore.getState().stats.activeSessions).toBe(3);
    });

    it('should handle adding event to already full buffer (exactly 50)', () => {
      for (let i = 0; i < 50; i++) {
        useMonitorStore.getState().addEvent(makeEvent({ id: `evt-${i}` }));
      }
      expect(useMonitorStore.getState().events).toHaveLength(50);

      // Add one more — should still be 50
      useMonitorStore.getState().addEvent(makeEvent({ id: 'evt-50' }));
      expect(useMonitorStore.getState().events).toHaveLength(50);
      expect(useMonitorStore.getState().events[49].id).toBe('evt-50');
      expect(useMonitorStore.getState().events[0].id).toBe('evt-1');
    });
  });

  // =========================================================================
  // clearEvents
  // =========================================================================

  describe('clearEvents', () => {
    it('should reset events and stats', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'error' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2' }));
      useMonitorStore.getState().clearEvents();

      const state = useMonitorStore.getState();
      expect(state.events).toEqual([]);
      expect(state.stats).toEqual({
        total: 0,
        successRate: 100,
        errorCount: 0,
        activeSessions: 0,
      });
    });

    it('should not affect other state (connected, metrics, alerts)', () => {
      useMonitorStore.setState({
        connected: true,
        metrics: { cpu: 50, memory: 75, latency: 100, throughput: 200 },
      });
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a1' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1' }));

      useMonitorStore.getState().clearEvents();

      const state = useMonitorStore.getState();
      expect(state.connected).toBe(true);
      expect(state.metrics).toEqual({ cpu: 50, memory: 75, latency: 100, throughput: 200 });
      expect(state.alerts).toHaveLength(1);
    });

    it('should be idempotent on empty events', () => {
      useMonitorStore.getState().clearEvents();
      const state = useMonitorStore.getState();
      expect(state.events).toEqual([]);
      expect(state.stats.total).toBe(0);
    });
  });

  // =========================================================================
  // setConnected
  // =========================================================================

  describe('setConnected', () => {
    it('should set connected to true', () => {
      useMonitorStore.getState().setConnected(true);
      expect(useMonitorStore.getState().connected).toBe(true);
    });

    it('should set connected to false', () => {
      useMonitorStore.getState().setConnected(true);
      useMonitorStore.getState().setConnected(false);
      expect(useMonitorStore.getState().connected).toBe(false);
    });
  });

  // =========================================================================
  // setCurrentTool
  // =========================================================================

  describe('setCurrentTool', () => {
    it('should set a tool', () => {
      const tool = { name: 'Read', startedAt: new Date().toISOString() };
      useMonitorStore.getState().setCurrentTool(tool);
      expect(useMonitorStore.getState().currentTool).toEqual(tool);
    });

    it('should clear tool by setting null', () => {
      const tool = { name: 'Read', startedAt: new Date().toISOString() };
      useMonitorStore.getState().setCurrentTool(tool);
      useMonitorStore.getState().setCurrentTool(null);
      expect(useMonitorStore.getState().currentTool).toBeNull();
    });

    it('should overwrite previous tool', () => {
      useMonitorStore.getState().setCurrentTool({ name: 'Read', startedAt: '2024-01-01T00:00:00Z' });
      useMonitorStore.getState().setCurrentTool({ name: 'Write', startedAt: '2024-01-01T00:01:00Z' });
      expect(useMonitorStore.getState().currentTool?.name).toBe('Write');
    });
  });

  // =========================================================================
  // setMetrics
  // =========================================================================

  describe('setMetrics', () => {
    it('should update all metrics', () => {
      const metrics = { cpu: 45, memory: 60, latency: 120, throughput: 500 };
      useMonitorStore.getState().setMetrics(metrics);
      expect(useMonitorStore.getState().metrics).toEqual(metrics);
    });

    it('should handle zero values', () => {
      useMonitorStore.getState().setMetrics({ cpu: 0, memory: 0, latency: 0, throughput: 0 });
      expect(useMonitorStore.getState().metrics).toEqual({ cpu: 0, memory: 0, latency: 0, throughput: 0 });
    });

    it('should handle high values', () => {
      const metrics = { cpu: 100, memory: 99.9, latency: 99999, throughput: 1_000_000 };
      useMonitorStore.getState().setMetrics(metrics);
      expect(useMonitorStore.getState().metrics).toEqual(metrics);
    });

    it('should fully replace previous metrics', () => {
      useMonitorStore.getState().setMetrics({ cpu: 10, memory: 20, latency: 30, throughput: 40 });
      useMonitorStore.getState().setMetrics({ cpu: 90, memory: 80, latency: 70, throughput: 60 });
      expect(useMonitorStore.getState().metrics).toEqual({ cpu: 90, memory: 80, latency: 70, throughput: 60 });
    });
  });

  // =========================================================================
  // addAlert
  // =========================================================================

  describe('addAlert', () => {
    it('should append a single alert', () => {
      const alert = makeAlert({ id: 'a1', message: 'High CPU', severity: 'warning' });
      useMonitorStore.getState().addAlert(alert);

      expect(useMonitorStore.getState().alerts).toHaveLength(1);
      expect(useMonitorStore.getState().alerts[0]).toEqual(alert);
    });

    it('should append multiple alerts preserving order', () => {
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a1', message: 'First' }));
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a2', message: 'Second' }));
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a3', message: 'Third' }));

      const alerts = useMonitorStore.getState().alerts;
      expect(alerts).toHaveLength(3);
      expect(alerts[0].id).toBe('a1');
      expect(alerts[1].id).toBe('a2');
      expect(alerts[2].id).toBe('a3');
    });

    it('should support all severity levels', () => {
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a1', severity: 'info' }));
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a2', severity: 'warning' }));
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a3', severity: 'error' }));

      const alerts = useMonitorStore.getState().alerts;
      expect(alerts[0].severity).toBe('info');
      expect(alerts[1].severity).toBe('warning');
      expect(alerts[2].severity).toBe('error');
    });
  });

  // =========================================================================
  // dismissAlert
  // =========================================================================

  describe('dismissAlert', () => {
    it('should set dismissed to true for matching alert', () => {
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a1' }));
      useMonitorStore.getState().dismissAlert('a1');

      expect(useMonitorStore.getState().alerts[0].dismissed).toBe(true);
    });

    it('should not affect other alerts', () => {
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a1', message: 'First' }));
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a2', message: 'Second' }));
      useMonitorStore.getState().dismissAlert('a1');

      const alerts = useMonitorStore.getState().alerts;
      expect(alerts[0].dismissed).toBe(true);
      expect(alerts[1].dismissed).toBe(false);
    });

    it('should be a no-op for non-existent alert id', () => {
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a1' }));
      useMonitorStore.getState().dismissAlert('non-existent');

      const alerts = useMonitorStore.getState().alerts;
      expect(alerts).toHaveLength(1);
      expect(alerts[0].dismissed).toBe(false);
    });

    it('should be idempotent — dismissing twice keeps dismissed true', () => {
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a1' }));
      useMonitorStore.getState().dismissAlert('a1');
      useMonitorStore.getState().dismissAlert('a1');

      expect(useMonitorStore.getState().alerts[0].dismissed).toBe(true);
    });
  });

  // =========================================================================
  // toggleEventFilter
  // =========================================================================

  describe('toggleEventFilter', () => {
    it('should add a filter type', () => {
      useMonitorStore.getState().toggleEventFilter('error');
      expect(useMonitorStore.getState().eventFilters.has('error')).toBe(true);
    });

    it('should remove a filter type on second toggle', () => {
      useMonitorStore.getState().toggleEventFilter('error');
      useMonitorStore.getState().toggleEventFilter('error');
      expect(useMonitorStore.getState().eventFilters.has('error')).toBe(false);
    });

    it('should support multiple concurrent filters', () => {
      useMonitorStore.getState().toggleEventFilter('error');
      useMonitorStore.getState().toggleEventFilter('tool_call');
      useMonitorStore.getState().toggleEventFilter('message');

      const filters = useMonitorStore.getState().eventFilters;
      expect(filters.size).toBe(3);
      expect(filters.has('error')).toBe(true);
      expect(filters.has('tool_call')).toBe(true);
      expect(filters.has('message')).toBe(true);
    });

    it('should remove one filter without affecting others', () => {
      useMonitorStore.getState().toggleEventFilter('error');
      useMonitorStore.getState().toggleEventFilter('tool_call');
      useMonitorStore.getState().toggleEventFilter('error'); // remove

      const filters = useMonitorStore.getState().eventFilters;
      expect(filters.size).toBe(1);
      expect(filters.has('error')).toBe(false);
      expect(filters.has('tool_call')).toBe(true);
    });

    it('should handle all four event types', () => {
      const types: MonitorEvent['type'][] = ['tool_call', 'message', 'error', 'system'];
      types.forEach((t) => useMonitorStore.getState().toggleEventFilter(t));

      const filters = useMonitorStore.getState().eventFilters;
      expect(filters.size).toBe(4);
      types.forEach((t) => expect(filters.has(t)).toBe(true));
    });
  });

  // =========================================================================
  // getFilteredEvents
  // =========================================================================

  describe('getFilteredEvents', () => {
    beforeEach(() => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'tool_call' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2', type: 'error' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e3', type: 'message' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e4', type: 'system' }));
    });

    it('should return all events when no filters are set', () => {
      const filtered = useMonitorStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(4);
    });

    it('should return only matching events when a single filter is set', () => {
      useMonitorStore.getState().toggleEventFilter('error');
      const filtered = useMonitorStore.getState().getFilteredEvents();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('error');
    });

    it('should return events matching any of the active filters', () => {
      useMonitorStore.getState().toggleEventFilter('error');
      useMonitorStore.getState().toggleEventFilter('tool_call');
      const filtered = useMonitorStore.getState().getFilteredEvents();

      expect(filtered).toHaveLength(2);
      expect(filtered.map((e) => e.type).sort()).toEqual(['error', 'tool_call']);
    });

    it('should return all events when all types are filtered', () => {
      useMonitorStore.getState().toggleEventFilter('tool_call');
      useMonitorStore.getState().toggleEventFilter('error');
      useMonitorStore.getState().toggleEventFilter('message');
      useMonitorStore.getState().toggleEventFilter('system');

      const filtered = useMonitorStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(4);
    });

    it('should return empty array when filter does not match any events', () => {
      // Remove all events except tool_call, then filter for system
      resetStore();
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', type: 'tool_call' }));
      useMonitorStore.getState().toggleEventFilter('system');

      const filtered = useMonitorStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(0);
    });

    it('should return empty when events are empty regardless of filters', () => {
      resetStore();
      useMonitorStore.getState().toggleEventFilter('error');

      const filtered = useMonitorStore.getState().getFilteredEvents();
      expect(filtered).toHaveLength(0);
    });
  });

  // =========================================================================
  // connectToMonitor — local mode
  // =========================================================================

  describe('connectToMonitor (local mode)', () => {
    let originalWebSocket: typeof WebSocket;
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalWebSocket = globalThis.WebSocket;
      originalFetch = globalThis.fetch;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globalThis.WebSocket = MockWebSocket as any;
      MockWebSocket.instances = [];

      vi.mocked(getConnectionConfig).mockReturnValue({
        mode: 'local',
        wsUrl: 'ws://localhost:4001/stream',
        httpUrl: 'http://localhost:4001',
        roomId: undefined,
        token: undefined,
      });
    });

    afterEach(() => {
      // Clean up WebSocket and timers
      useMonitorStore.getState().disconnectFromMonitor();
      globalThis.WebSocket = originalWebSocket;
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should probe /stats then open WebSocket on success', async () => {
      const statsResponse = {
        total: 10,
        success_rate: 90,
        errors: 2,
        sessions_active: 3,
      };
      const eventsResponse: unknown[] = [];

      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(statsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(eventsResponse),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      // Wait for the /stats fetch to resolve
      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      // Stats should be updated from server response
      const state = useMonitorStore.getState();
      expect(state.stats.total).toBe(10);
      expect(state.stats.successRate).toBe(90);
      expect(state.stats.errorCount).toBe(2);
      expect(state.stats.activeSessions).toBe(3);
    });

    it('should set connected to true when WebSocket opens', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();

      expect(useMonitorStore.getState().connected).toBe(true);
    });

    it('should handle init message with event replay', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();
      wsInstance.simulateMessage({
        type: 'init',
        events: [
          { id: 'r1', type: 'tool_call', timestamp: '2024-01-01T00:00:00Z', data: { agent: 'dev', description: 'Init event' } },
          { id: 'r2', type: 'message', timestamp: '2024-01-01T00:01:00Z', data: { agent: 'qa', description: 'Message' } },
        ],
      });

      const events = useMonitorStore.getState().events;
      expect(events).toHaveLength(2);
    });

    it('should handle single event messages', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();
      wsInstance.simulateMessage({
        type: 'event',
        event: {
          id: 'live-1',
          type: 'tool_call',
          timestamp: '2024-01-01T00:00:00Z',
          data: { agent: 'dev', description: 'Live event', tool_name: 'Read' },
        },
      });

      const events = useMonitorStore.getState().events;
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('live-1');
    });

    it('should handle room_update messages (cloud mode state)', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();
      wsInstance.simulateMessage({
        type: 'room_update',
        room: { cliConnected: true },
      });

      expect(useMonitorStore.getState().cliConnected).toBe(true);
    });

    it('should ignore pong messages', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();
      wsInstance.simulateMessage({ type: 'pong' });

      expect(useMonitorStore.getState().events).toHaveLength(0);
    });

    it('should treat unknown message types as raw events', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();
      wsInstance.simulateMessage({
        id: 'raw-1',
        type: 'unknownType',
        data: { agent: 'system', description: 'Raw event' },
      });

      const events = useMonitorStore.getState().events;
      expect(events).toHaveLength(1);
    });

    it('should set connected to false on WebSocket close', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();
      expect(useMonitorStore.getState().connected).toBe(true);

      wsInstance.simulateClose();
      expect(useMonitorStore.getState().connected).toBe(false);
    });

    it('should set connected to false on WebSocket error', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();
      wsInstance.simulateError();

      expect(useMonitorStore.getState().connected).toBe(false);
    });

    it('should load recent events from /events/recent', async () => {
      const recentEvents = [
        { id: 'h1', type: 'tool_call', timestamp: '2024-01-01T00:00:00Z', data: { agent: 'dev', description: 'Hist1' } },
        { id: 'h2', type: 'message', timestamp: '2024-01-01T00:01:00Z', data: { agent: 'qa', description: 'Hist2' } },
      ];

      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ total: 5, success_rate: 80, errors: 1, sessions_active: 2 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(recentEvents),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(useMonitorStore.getState().events).toHaveLength(2);
      }, { timeout: 3000 });
    });
  });

  // =========================================================================
  // connectToMonitor — cloud mode
  // =========================================================================

  describe('connectToMonitor (cloud mode)', () => {
    let originalWebSocket: typeof WebSocket;
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalWebSocket = globalThis.WebSocket;
      originalFetch = globalThis.fetch;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globalThis.WebSocket = MockWebSocket as any;
      MockWebSocket.instances = [];
      globalThis.fetch = vi.fn() as unknown as typeof fetch;

      vi.mocked(getConnectionConfig).mockReturnValue({
        mode: 'cloud',
        wsUrl: 'wss://relay.example.com/dashboard?room=room-1&token=abc',
        httpUrl: 'https://relay.example.com',
        roomId: 'room-1',
        token: 'abc',
      });
    });

    afterEach(() => {
      useMonitorStore.getState().disconnectFromMonitor();
      globalThis.WebSocket = originalWebSocket;
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should set connectionMode and roomId', () => {
      useMonitorStore.getState().connectToMonitor();

      const state = useMonitorStore.getState();
      expect(state.connectionMode).toBe('cloud');
      expect(state.roomId).toBe('room-1');
    });

    it('should open WebSocket immediately (no HTTP probing)', () => {
      useMonitorStore.getState().connectToMonitor();

      // Cloud mode should not probe HTTP; it goes directly to WebSocket
      expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle init message with room cliConnected state', () => {
      useMonitorStore.getState().connectToMonitor();

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();
      wsInstance.simulateMessage({
        type: 'init',
        events: [],
        room: { cliConnected: true },
      });

      expect(useMonitorStore.getState().cliConnected).toBe(true);
    });
  });

  // =========================================================================
  // connectToMonitor — engine mode
  // =========================================================================

  describe('connectToMonitor (engine mode)', () => {
    let originalWebSocket: typeof WebSocket;
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalWebSocket = globalThis.WebSocket;
      originalFetch = globalThis.fetch;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globalThis.WebSocket = MockWebSocket as any;
      MockWebSocket.instances = [];

      vi.mocked(getConnectionConfig).mockReturnValue({
        mode: 'engine',
        wsUrl: 'ws://localhost:4002/live',
        httpUrl: 'http://localhost:4002',
        roomId: undefined,
        token: undefined,
      });
    });

    afterEach(() => {
      useMonitorStore.getState().disconnectFromMonitor();
      globalThis.WebSocket = originalWebSocket;
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should probe /health then open WebSocket on success', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ws_clients: 5 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ occupied: 3, queue_length: 7 }),
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      // Stats should include engine health data
      await vi.waitFor(() => {
        const state = useMonitorStore.getState();
        return state.stats.activeSessions === 3;
      });

      const state = useMonitorStore.getState();
      expect(state.stats.activeSessions).toBe(3);
      expect(state.stats.total).toBe(7);
    });

    it('should fallback to monitor when engine /health fails', async () => {
      globalThis.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Engine unavailable'))
        // Fallback: local /stats probe
        .mockResolvedValueOnce({
          ok: true,
        }) as unknown as typeof fetch;

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(useMonitorStore.getState().connectionMode).toBe('local');
      }, { timeout: 3000 });
    });
  });

  // =========================================================================
  // disconnectFromMonitor
  // =========================================================================

  describe('disconnectFromMonitor', () => {
    let originalWebSocket: typeof WebSocket;
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalWebSocket = globalThis.WebSocket;
      originalFetch = globalThis.fetch;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globalThis.WebSocket = MockWebSocket as any;
      MockWebSocket.instances = [];
    });

    afterEach(() => {
      globalThis.WebSocket = originalWebSocket;
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should set connected to false', () => {
      useMonitorStore.setState({ connected: true });
      useMonitorStore.getState().disconnectFromMonitor();
      expect(useMonitorStore.getState().connected).toBe(false);
    });

    it('should close the WebSocket and nullify onclose to prevent reconnect', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) as unknown as typeof fetch;

      vi.mocked(getConnectionConfig).mockReturnValue({
        mode: 'local',
        wsUrl: 'ws://localhost:4001/stream',
        httpUrl: 'http://localhost:4001',
        roomId: undefined,
        token: undefined,
      });

      useMonitorStore.getState().connectToMonitor();

      await vi.waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(1);
      });

      const wsInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      wsInstance.simulateOpen();

      useMonitorStore.getState().disconnectFromMonitor();

      expect(wsInstance.close).toHaveBeenCalled();
      // onclose should have been nullified before close() to prevent reconnect
      expect(wsInstance.onclose).toBeNull();
    });

    it('should be safe to call when not connected', () => {
      // Should not throw
      expect(() => {
        useMonitorStore.getState().disconnectFromMonitor();
      }).not.toThrow();

      expect(useMonitorStore.getState().connected).toBe(false);
    });
  });

  // =========================================================================
  // connectToMonitor — options override
  // =========================================================================

  describe('connectToMonitor with options override', () => {
    let originalWebSocket: typeof WebSocket;
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalWebSocket = globalThis.WebSocket;
      originalFetch = globalThis.fetch;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globalThis.WebSocket = MockWebSocket as any;
      MockWebSocket.instances = [];
      globalThis.fetch = vi.fn()
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        }) as unknown as typeof fetch;

      vi.mocked(getConnectionConfig).mockReturnValue({
        mode: 'local',
        wsUrl: 'ws://localhost:4001/stream',
        httpUrl: 'http://localhost:4001',
        roomId: undefined,
        token: undefined,
      });
    });

    afterEach(() => {
      useMonitorStore.getState().disconnectFromMonitor();
      globalThis.WebSocket = originalWebSocket;
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should use roomId from options when provided', () => {
      useMonitorStore.getState().connectToMonitor({ roomId: 'custom-room' });

      const state = useMonitorStore.getState();
      expect(state.roomId).toBe('custom-room');
    });
  });

  // =========================================================================
  // Edge cases and integration
  // =========================================================================

  describe('edge cases', () => {
    it('should handle rapid addEvent + clearEvents', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1' }));
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e2' }));
      useMonitorStore.getState().clearEvents();
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e3' }));

      const state = useMonitorStore.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].id).toBe('e3');
      expect(state.stats.total).toBe(1);
    });

    it('should handle toggleEventFilter then getFilteredEvents on empty events', () => {
      useMonitorStore.getState().toggleEventFilter('error');
      const filtered = useMonitorStore.getState().getFilteredEvents();
      expect(filtered).toEqual([]);
    });

    it('should maintain independent state for alerts and events', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1' }));
      useMonitorStore.getState().addAlert(makeAlert({ id: 'a1' }));
      useMonitorStore.getState().clearEvents();

      expect(useMonitorStore.getState().events).toEqual([]);
      expect(useMonitorStore.getState().alerts).toHaveLength(1);
    });

    it('should handle events with all optional fields undefined', () => {
      const event: MonitorEvent = {
        id: 'minimal-1',
        timestamp: new Date().toISOString(),
        type: 'system',
        agent: 'System',
        description: 'Minimal event',
        duration: undefined,
        success: undefined,
      };

      useMonitorStore.getState().addEvent(event);

      const stored = useMonitorStore.getState().events[0];
      expect(stored.id).toBe('minimal-1');
      expect(stored.duration).toBeUndefined();
      expect(stored.success).toBeUndefined();
    });

    it('should handle events with duration set', () => {
      useMonitorStore.getState().addEvent(makeEvent({ id: 'e1', duration: 1500 }));
      expect(useMonitorStore.getState().events[0].duration).toBe(1500);
    });

    it('should correctly recalculate stats after buffer wraps around', () => {
      // Fill with 50 error events
      for (let i = 0; i < 50; i++) {
        useMonitorStore.getState().addEvent(makeEvent({ id: `err-${i}`, type: 'error' }));
      }
      expect(useMonitorStore.getState().stats.errorCount).toBe(50);

      // Add 50 non-error events to completely replace the buffer
      for (let i = 0; i < 50; i++) {
        useMonitorStore.getState().addEvent(makeEvent({ id: `ok-${i}`, type: 'tool_call', success: true }));
      }

      const state = useMonitorStore.getState();
      expect(state.stats.errorCount).toBe(0);
      expect(state.stats.successRate).toBe(100);
      expect(state.events).toHaveLength(50);
    });
  });
});
