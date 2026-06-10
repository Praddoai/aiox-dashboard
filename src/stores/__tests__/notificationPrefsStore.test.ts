import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationPrefsStore } from '../notificationPrefsStore';

describe('notificationPrefsStore', () => {
  beforeEach(() => {
    useNotificationPrefsStore.getState().resetPrefs();
  });

  it('should have correct defaults', () => {
    const state = useNotificationPrefsStore.getState();
    expect(state.pushEnabled).toBe(true);
    expect(state.soundEnabled).toBe(false);
    expect(state.errors).toBe(true);
    expect(state.systemUpdates).toBe(false);
  });

  it('should update a preference', () => {
    useNotificationPrefsStore.getState().setPref('soundEnabled', true);
    expect(useNotificationPrefsStore.getState().soundEnabled).toBe(true);
  });

  it('should reset to defaults', () => {
    useNotificationPrefsStore.getState().setPref('pushEnabled', false);
    useNotificationPrefsStore.getState().setPref('dailySummary', true);
    useNotificationPrefsStore.getState().resetPrefs();
    expect(useNotificationPrefsStore.getState().pushEnabled).toBe(true);
    expect(useNotificationPrefsStore.getState().dailySummary).toBe(false);
  });
});
