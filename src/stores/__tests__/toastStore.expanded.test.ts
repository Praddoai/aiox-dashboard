import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToastStore } from '../toastStore';

vi.mock('../../hooks/useSound', () => ({
  playSound: vi.fn(),
}));

import { playSound } from '../../hooks/useSound';

describe('toastStore — expanded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useToastStore.setState({
      toasts: [],
      notifications: [],
      unreadCount: 0,
      desktopNotificationsEnabled: false,
    });
  });

  // --- addToast ---

  it('should generate unique sequential toast IDs', () => {
    const id1 = useToastStore.getState().addToast({ type: 'info', title: 'A' });
    const id2 = useToastStore.getState().addToast({ type: 'info', title: 'B' });

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^toast-\d+$/);
    expect(id2).toMatch(/^toast-\d+$/);
  });

  it('should store toast with all fields', () => {
    const onClick = vi.fn();
    useToastStore.getState().addToast({
      type: 'warning',
      title: 'Alert',
      message: 'Something happened',
      duration: 8000,
      action: { label: 'Undo', onClick },
    });

    const toast = useToastStore.getState().toasts[0];
    expect(toast.type).toBe('warning');
    expect(toast.title).toBe('Alert');
    expect(toast.message).toBe('Something happened');
    expect(toast.duration).toBe(8000);
    expect(toast.action?.label).toBe('Undo');
    toast.action?.onClick();
    expect(onClick).toHaveBeenCalled();
  });

  it('should add notification with correct fields', () => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Fail',
      message: 'Details here',
    });

    const notif = useToastStore.getState().notifications[0];
    expect(notif.type).toBe('error');
    expect(notif.title).toBe('Fail');
    expect(notif.message).toBe('Details here');
    expect(notif.read).toBe(false);
    expect(notif.timestamp).toBeGreaterThan(0);
  });

  it('should prepend new notifications (newest first)', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'First' });
    useToastStore.getState().addToast({ type: 'info', title: 'Second' });

    const notifs = useToastStore.getState().notifications;
    expect(notifs[0].title).toBe('Second');
    expect(notifs[1].title).toBe('First');
  });

  it('should increment unreadCount with each toast', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'A' });
    useToastStore.getState().addToast({ type: 'info', title: 'B' });
    useToastStore.getState().addToast({ type: 'info', title: 'C' });

    expect(useToastStore.getState().unreadCount).toBe(3);
  });

  // --- Sound effects ---

  it('should play error sound for error toasts', () => {
    useToastStore.getState().addToast({ type: 'error', title: 'Err' });
    expect(playSound).toHaveBeenCalledWith('error');
  });

  it('should play success sound for success toasts', () => {
    useToastStore.getState().addToast({ type: 'success', title: 'Ok' });
    expect(playSound).toHaveBeenCalledWith('success');
  });

  it('should play notify sound for info and warning toasts', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'Info' });
    expect(playSound).toHaveBeenCalledWith('notify');

    vi.mocked(playSound).mockClear();
    useToastStore.getState().addToast({ type: 'warning', title: 'Warn' });
    expect(playSound).toHaveBeenCalledWith('notify');
  });

  // --- Auto-remove ---

  it('should auto-remove toast after duration', () => {
    vi.useFakeTimers();

    useToastStore.getState().addToast({ type: 'info', title: 'Auto', duration: 3000 });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(3000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should NOT auto-remove toast when duration is 0', () => {
    vi.useFakeTimers();

    useToastStore.getState().addToast({ type: 'info', title: 'Sticky', duration: 0 });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(60000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  // --- removeToast ---

  it('should only remove specified toast', () => {
    const id1 = useToastStore.getState().addToast({ type: 'info', title: 'A' });
    useToastStore.getState().addToast({ type: 'info', title: 'B' });

    useToastStore.getState().removeToast(id1);

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].title).toBe('B');
  });

  it('should handle removing non-existent toast gracefully', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'A' });
    useToastStore.getState().removeToast('non-existent');

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  // --- markAllRead ---

  it('should mark all notifications as read and reset unreadCount', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'A' });
    useToastStore.getState().addToast({ type: 'info', title: 'B' });

    useToastStore.getState().markAllRead();

    expect(useToastStore.getState().unreadCount).toBe(0);
    expect(useToastStore.getState().notifications.every(n => n.read)).toBe(true);
    // Notifications still exist
    expect(useToastStore.getState().notifications).toHaveLength(2);
  });

  // --- clearNotifications ---

  it('should clear all notifications and reset unreadCount', () => {
    useToastStore.getState().addToast({ type: 'info', title: 'A' });
    useToastStore.getState().addToast({ type: 'info', title: 'B' });

    useToastStore.getState().clearNotifications();

    expect(useToastStore.getState().notifications).toHaveLength(0);
    expect(useToastStore.getState().unreadCount).toBe(0);
  });

  // --- Desktop notifications ---

  it('should set desktop notifications flag', () => {
    useToastStore.getState().setDesktopNotifications(true);
    expect(useToastStore.getState().desktopNotificationsEnabled).toBe(true);

    useToastStore.getState().setDesktopNotifications(false);
    expect(useToastStore.getState().desktopNotificationsEnabled).toBe(false);
  });

  it('should enable desktop notifications when permission is granted', async () => {
    // Mock Notification API
    const originalNotification = globalThis.Notification;
    globalThis.Notification = {
      permission: 'granted',
      requestPermission: vi.fn(),
    } as unknown as typeof Notification;

    const result = await useToastStore.getState().enableDesktopNotifications();

    expect(result).toBe(true);
    expect(useToastStore.getState().desktopNotificationsEnabled).toBe(true);

    globalThis.Notification = originalNotification;
  });

  it('should return false when notification permission is denied', async () => {
    const originalNotification = globalThis.Notification;
    globalThis.Notification = {
      permission: 'denied',
      requestPermission: vi.fn(),
    } as unknown as typeof Notification;

    const result = await useToastStore.getState().enableDesktopNotifications();

    expect(result).toBe(false);

    globalThis.Notification = originalNotification;
  });

  it('should request permission when status is default', async () => {
    const originalNotification = globalThis.Notification;
    const mockRequest = vi.fn().mockResolvedValue('granted');
    globalThis.Notification = {
      permission: 'default',
      requestPermission: mockRequest,
    } as unknown as typeof Notification;

    const result = await useToastStore.getState().enableDesktopNotifications();

    expect(mockRequest).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(useToastStore.getState().desktopNotificationsEnabled).toBe(true);

    globalThis.Notification = originalNotification;
  });

  it('should handle requestPermission denial', async () => {
    const originalNotification = globalThis.Notification;
    globalThis.Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('denied'),
    } as unknown as typeof Notification;

    const result = await useToastStore.getState().enableDesktopNotifications();

    expect(result).toBe(false);
    expect(useToastStore.getState().desktopNotificationsEnabled).toBe(false);

    globalThis.Notification = originalNotification;
  });

  // --- Notification history cap ---

  it('should cap notifications at 50 (newest first)', () => {
    for (let i = 0; i < 55; i++) {
      useToastStore.getState().addToast({ type: 'info', title: `N${i}` });
    }

    const notifs = useToastStore.getState().notifications;
    expect(notifs).toHaveLength(50);
    // Newest should be first
    expect(notifs[0].title).toBe('N54');
  });
});
