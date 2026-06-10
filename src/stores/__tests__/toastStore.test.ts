import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToastStore } from '../toastStore';

// Mock useSound
vi.mock('../../hooks/useSound', () => ({
  playSound: vi.fn(),
}));

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [], notifications: [], unreadCount: 0 });
  });

  it('should add a toast and notification', () => {
    const id = useToastStore.getState().addToast({ type: 'success', title: 'Test' });

    expect(id).toMatch(/^toast-/);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].title).toBe('Test');
    expect(useToastStore.getState().notifications).toHaveLength(1);
    expect(useToastStore.getState().unreadCount).toBe(1);
  });

  it('should remove a toast', () => {
    const id = useToastStore.getState().addToast({ type: 'info', title: 'Remove me' });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should clear all toasts', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'A' });
    useToastStore.getState().addToast({ type: 'info', title: 'B' });
    expect(useToastStore.getState().toasts).toHaveLength(2);

    useToastStore.getState().clearToasts();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should mark all notifications as read', () => {
    useToastStore.getState().addToast({ type: 'success', title: 'A' });
    useToastStore.getState().addToast({ type: 'error', title: 'B' });
    expect(useToastStore.getState().unreadCount).toBe(2);

    useToastStore.getState().markAllRead();
    expect(useToastStore.getState().unreadCount).toBe(0);
    expect(useToastStore.getState().notifications.every((n) => n.read)).toBe(true);
  });

  it('should clear all notifications', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'A' });
    useToastStore.getState().clearNotifications();

    expect(useToastStore.getState().notifications).toHaveLength(0);
    expect(useToastStore.getState().unreadCount).toBe(0);
  });

  it('should keep only last 50 notifications', () => {
    for (let i = 0; i < 55; i++) {
      useToastStore.getState().addToast({ type: 'info', title: `N${i}` });
    }
    expect(useToastStore.getState().notifications).toHaveLength(50);
  });

  it('should set default duration of 5000ms', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'Default' });
    expect(useToastStore.getState().toasts[0].duration).toBe(5000);
  });

  it('should respect custom duration', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'Custom', duration: 10000 });
    expect(useToastStore.getState().toasts[0].duration).toBe(10000);
  });
});
