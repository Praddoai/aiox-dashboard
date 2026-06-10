import { describe, it, expect, beforeEach } from 'vitest';
import { useOrchestrationStore } from '../orchestrationStore';

describe('orchestrationStore', () => {
  beforeEach(() => {
    useOrchestrationStore.setState({
      pending: [],
      isRunning: false,
      badgeCount: 0,
    });
  });

  it('should have correct initial state', () => {
    const state = useOrchestrationStore.getState();
    expect(state.pending).toEqual([]);
    expect(state.isRunning).toBe(false);
    expect(state.badgeCount).toBe(0);
  });

  it('should set isRunning to true', () => {
    useOrchestrationStore.getState().setRunning(true);
    expect(useOrchestrationStore.getState().isRunning).toBe(true);
  });

  it('should set isRunning to false', () => {
    useOrchestrationStore.setState({ isRunning: true });
    useOrchestrationStore.getState().setRunning(false);
    expect(useOrchestrationStore.getState().isRunning).toBe(false);
  });

  it('should add a notification with timestamp', () => {
    const before = Date.now();
    useOrchestrationStore.getState().addNotification({
      taskId: 'task-1',
      demand: 'Build feature',
      status: 'completed',
    });
    const after = Date.now();

    const state = useOrchestrationStore.getState();
    expect(state.pending).toHaveLength(1);
    expect(state.pending[0].taskId).toBe('task-1');
    expect(state.pending[0].demand).toBe('Build feature');
    expect(state.pending[0].status).toBe('completed');
    expect(state.pending[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(state.pending[0].timestamp).toBeLessThanOrEqual(after);
  });

  it('should update badgeCount when adding a notification', () => {
    useOrchestrationStore.getState().addNotification({
      taskId: 'task-1',
      demand: 'Build feature',
      status: 'completed',
    });
    expect(useOrchestrationStore.getState().badgeCount).toBe(1);

    useOrchestrationStore.getState().addNotification({
      taskId: 'task-2',
      demand: 'Fix bug',
      status: 'failed',
    });
    expect(useOrchestrationStore.getState().badgeCount).toBe(2);
  });

  it('should set isRunning to false when adding a notification', () => {
    useOrchestrationStore.setState({ isRunning: true });
    useOrchestrationStore.getState().addNotification({
      taskId: 'task-1',
      demand: 'Build feature',
      status: 'completed',
    });
    expect(useOrchestrationStore.getState().isRunning).toBe(false);
  });

  it('should clear all pending notifications and reset badgeCount', () => {
    useOrchestrationStore.getState().addNotification({
      taskId: 'task-1',
      demand: 'Build feature',
      status: 'completed',
    });
    useOrchestrationStore.getState().addNotification({
      taskId: 'task-2',
      demand: 'Fix bug',
      status: 'failed',
    });

    useOrchestrationStore.getState().clearPending();
    const state = useOrchestrationStore.getState();
    expect(state.pending).toEqual([]);
    expect(state.badgeCount).toBe(0);
  });

  it('should dismiss a specific notification by taskId', () => {
    useOrchestrationStore.getState().addNotification({
      taskId: 'task-1',
      demand: 'Build feature',
      status: 'completed',
    });
    useOrchestrationStore.getState().addNotification({
      taskId: 'task-2',
      demand: 'Fix bug',
      status: 'failed',
    });

    useOrchestrationStore.getState().dismiss('task-1');
    const state = useOrchestrationStore.getState();
    expect(state.pending).toHaveLength(1);
    expect(state.pending[0].taskId).toBe('task-2');
    expect(state.badgeCount).toBe(1);
  });
});
