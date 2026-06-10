import { create } from 'zustand';
import { playSound } from '../hooks/useSound';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

interface ToastState {
  toasts: Toast[];
  notifications: NotificationItem[];
  unreadCount: number;
  desktopNotificationsEnabled: boolean;
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  enableDesktopNotifications: () => Promise<boolean>;
  setDesktopNotifications: (enabled: boolean) => void;
}

let toastCounter = 0;

// Desktop notification helper
function sendDesktopNotification(title: string, body?: string, type?: ToastType) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.hasFocus()) return; // Only when tab is not focused

  const iconMap: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  try {
    new Notification(`${iconMap[type || 'info']} ${title}`, {
      body: body || '',
      icon: '/favicon.ico',
      tag: 'aios-notification',
    });
  } catch { /* noop */ }
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  notifications: [],
  unreadCount: 0,
  desktopNotificationsEnabled: false,

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    // Add to notification history (keep last 50)
    const notification: NotificationItem = {
      id,
      type: toast.type,
      title: toast.title,
      message: toast.message,
      timestamp: Date.now(),
      read: false,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));

    // Play sound based on toast type
    if (toast.type === 'error') playSound('error');
    else if (toast.type === 'success') playSound('success');
    else playSound('notify');

    // Desktop notification when tab not focused
    if (get().desktopNotificationsEnabled) {
      sendDesktopNotification(toast.title, toast.message, toast.type);
    }

    // Auto-remove after duration (unless duration is 0)
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  enableDesktopNotifications: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      set({ desktopNotificationsEnabled: true });
      return true;
    }
    if (Notification.permission === 'denied') return false;
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    set({ desktopNotificationsEnabled: granted });
    return granted;
  },

  setDesktopNotifications: (enabled) => {
    set({ desktopNotificationsEnabled: enabled });
  },
}));

// Helper hook for easy toast creation
export function useToast() {
  const { addToast, removeToast, clearToasts } = useToastStore();

  return {
    toast: (toast: Omit<Toast, 'id'>) => addToast(toast),
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
    dismiss: removeToast,
    dismissAll: clearToasts,
  };
}
