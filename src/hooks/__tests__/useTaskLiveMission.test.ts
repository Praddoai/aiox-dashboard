import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskLiveMission } from '../useTaskLiveMission';

// Mock getSquadType
vi.mock('../../types', () => ({
  getSquadType: (id: string) => id,
}));

// --- EventSource mock ---
type ESListener = (event: MessageEvent) => void;

class MockEventSource {
  url: string;
  listeners: Record<string, ESListener[]> = {};
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, cb: ESListener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  close() {
    this.closed = true;
  }

  // Test helpers
  emit(event: string, data: Record<string, unknown>) {
    const listeners = this.listeners[event] || [];
    listeners.forEach(cb => cb(new MessageEvent(event, { data: JSON.stringify(data) })));
  }

  triggerError() {
    if (this.onerror) this.onerror();
  }

  static instances: MockEventSource[] = [];
  static reset() {
    MockEventSource.instances = [];
  }
  static last() {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
}

// Assign to global
(globalThis as Record<string, unknown>).EventSource = MockEventSource;

beforeEach(() => {
  vi.clearAllMocks();
  MockEventSource.reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTaskLiveMission', () => {
  it('initializes with empty state', () => {
    const { result } = renderHook(() => useTaskLiveMission());
    expect(result.current.state.mission).toBeNull();
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.taskId).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('creates task and establishes SSE on start', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-abc' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());

    await act(async () => {
      await result.current.start('Build a website');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.state.isRunning).toBe(true);
    expect(result.current.state.taskId).toBe('task-abc');
    expect(result.current.state.mission).not.toBeNull();
    expect(result.current.state.mission!.name).toBe('Build a website');

    // EventSource should have been created
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.last().url).toContain('task-abc/stream');
  });

  it('sets initial mission with start and orchestrator nodes', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());

    await act(async () => {
      await result.current.start('Test demand');
    });

    const mission = result.current.state.mission!;
    expect(mission.nodes).toHaveLength(2);
    expect(mission.nodes[0].id).toBe('node-start');
    expect(mission.nodes[0].status).toBe('completed');
    expect(mission.nodes[1].id).toBe('node-orchestrator');
    expect(mission.nodes[1].status).toBe('active');
    expect(mission.edges).toHaveLength(1);
    expect(mission.agents).toHaveLength(1);
    expect(mission.agents[0].name).toBe('Bob');
  });

  it('handles task:analyzing event', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    const es = MockEventSource.last();
    act(() => es.emit('task:analyzing', {}));

    const orchNode = result.current.state.mission!.nodes.find(n => n.id === 'node-orchestrator');
    expect(orchNode!.currentAction).toBe('Analisando demanda...');
    expect(orchNode!.progress).toBe(10);
  });

  it('handles task:planning event', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    act(() => MockEventSource.last().emit('task:planning', {}));

    const orchNode = result.current.state.mission!.nodes.find(n => n.id === 'node-orchestrator');
    expect(orchNode!.currentAction).toBe('Planejando execução...');
    expect(orchNode!.progress).toBe(50);
  });

  it('handles task:squad-planned adding nodes and agents', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    act(() => {
      MockEventSource.last().emit('task:squad-planned', {
        squadId: 'design',
        chief: 'Brad',
        agents: [{ id: 'brad', name: 'Brad' }, { id: 'dan', name: 'Dan' }],
      });
    });

    const mission = result.current.state.mission!;
    // Should have: start, orchestrator, chief-design, agent-dan
    expect(mission.nodes.length).toBeGreaterThanOrEqual(4);
    expect(mission.nodes.find(n => n.id === 'node-chief-design')).toBeDefined();
    expect(mission.nodes.find(n => n.id === 'node-agent-dan')).toBeDefined();

    // Orchestrator should be completed
    const orch = mission.nodes.find(n => n.id === 'node-orchestrator');
    expect(orch!.status).toBe('completed');

    // Agents should include Brad and Dan
    expect(mission.agents.find(a => a.id === 'Brad')).toBeDefined();
    expect(mission.agents.find(a => a.id === 'dan')).toBeDefined();
  });

  it('handles task:completed event', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    act(() => MockEventSource.last().emit('task:completed', {}));

    expect(result.current.state.mission!.status).toBe('completed');
    expect(result.current.state.mission!.progress).toBe(100);
    expect(result.current.state.isRunning).toBe(false);
    // EventSource should be closed
    expect(MockEventSource.last().closed).toBe(true);
  });

  it('handles task:failed event', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    act(() => MockEventSource.last().emit('task:failed', { error: 'Something went wrong' }));

    expect(result.current.state.mission!.status).toBe('error');
    expect(result.current.state.isRunning).toBe(false);
  });

  it('handles fetch error on task creation', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.error).toBe('Failed to create task');
  });

  it('attempts reconnection on SSE error with exponential backoff', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    const firstES = MockEventSource.last();
    expect(MockEventSource.instances).toHaveLength(1);

    // Trigger error — should schedule reconnect at 1s
    act(() => firstES.triggerError());
    expect(firstES.closed).toBe(true);
    expect(result.current.state.error).toContain('Reconectando em 1s');

    // Advance timer to trigger reconnect
    act(() => vi.advanceTimersByTime(1000));
    expect(MockEventSource.instances).toHaveLength(2);

    // Second error — reconnect at 2s
    const secondES = MockEventSource.last();
    act(() => secondES.triggerError());
    expect(result.current.state.error).toContain('Reconectando em 2s');

    act(() => vi.advanceTimersByTime(2000));
    expect(MockEventSource.instances).toHaveLength(3);

    // Third error — reconnect at 4s
    const thirdES = MockEventSource.last();
    act(() => thirdES.triggerError());
    expect(result.current.state.error).toContain('Reconectando em 4s');

    act(() => vi.advanceTimersByTime(4000));
    expect(MockEventSource.instances).toHaveLength(4);

    // Fourth error — max attempts exceeded, stops
    const fourthES = MockEventSource.last();
    act(() => fourthES.triggerError());
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.error).toContain('Conexão perdida após várias tentativas');
  });

  it('resets reconnect counter on successful SSE message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    // First error + reconnect
    act(() => MockEventSource.last().triggerError());
    act(() => vi.advanceTimersByTime(1000));

    // Get new ES and send a successful event
    const newES = MockEventSource.last();
    act(() => newES.emit('task:analyzing', {}));

    // Now trigger another error — should start from attempt 1 again (1s delay)
    act(() => newES.triggerError());
    expect(result.current.state.error).toContain('Reconectando em 1s');
  });

  it('reset() clears state and closes connection', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    expect(result.current.state.mission).not.toBeNull();

    act(() => result.current.reset());

    expect(result.current.state.mission).toBeNull();
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.taskId).toBeNull();
    expect(MockEventSource.last().closed).toBe(true);
  });

  it('close() closes EventSource and clears reconnect timer', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    // Trigger error to set a reconnect timer
    act(() => MockEventSource.last().triggerError());

    // Close should clear everything
    act(() => result.current.close());

    // Timer should be cleared, so advancing time should NOT create a new EventSource
    const countBefore = MockEventSource.instances.length;
    act(() => vi.advanceTimersByTime(10000));
    expect(MockEventSource.instances).toHaveLength(countBefore);
  });

  it('truncates long demand names in mission', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const longDemand = 'A'.repeat(100);
    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start(longDemand); });

    expect(result.current.state.mission!.name.length).toBeLessThanOrEqual(60);
    expect(result.current.state.mission!.description).toBe(longDemand);
  });

  it('handles step:streaming:end with output enrichment', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ taskId: 'task-1' }),
    });

    const { result } = renderHook(() => useTaskLiveMission());
    await act(async () => { await result.current.start('Demand'); });

    // Add squad nodes first
    const es = MockEventSource.last();
    act(() => {
      es.emit('task:squad-planned', {
        squadId: 'dev',
        chief: 'Dex',
        agents: [{ id: 'dex', name: 'Dex' }],
      });
    });

    // Simulate streaming start to map stepId to nodeId
    act(() => {
      es.emit('step:streaming:start', {
        stepId: 'step-1',
        agent: { id: 'dex', name: 'Dex', squad: 'dev' },
        stepName: 'Implement feature',
      });
    });

    // Streaming end with response
    act(() => {
      es.emit('step:streaming:end', {
        stepId: 'step-1',
        response: 'Here is the implementation result',
      });
    });

    // Find the Dex node
    const dexNode = result.current.state.mission!.nodes.find(n => n.agentName === 'Dex');
    expect(dexNode).toBeDefined();
    expect(dexNode!.status).toBe('completed');
    expect(dexNode!.output).toBe('Here is the implementation result');
  });
});
