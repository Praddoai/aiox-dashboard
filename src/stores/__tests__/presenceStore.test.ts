import { describe, it, expect } from 'vitest';
import { usePresenceStore } from '../presenceStore';

describe('presenceStore', () => {
  it('should have demo users', () => {
    const { users } = usePresenceStore.getState();
    expect(users.length).toBeGreaterThan(0);
  });

  it('should have users with required fields', () => {
    const { users } = usePresenceStore.getState();
    users.forEach((u) => {
      expect(u.id).toBeTruthy();
      expect(u.name).toBeTruthy();
      expect(u.avatar).toBeTruthy();
      expect(u.color).toBeTruthy();
      expect(u.currentView).toBeTruthy();
      expect(u.lastSeen).toBeGreaterThan(0);
    });
  });

  it('should toggle showCursors', () => {
    expect(usePresenceStore.getState().showCursors).toBe(true);
    usePresenceStore.getState().setShowCursors(false);
    expect(usePresenceStore.getState().showCursors).toBe(false);
  });
});
