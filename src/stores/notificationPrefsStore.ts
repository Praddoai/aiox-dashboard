import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safePersistStorage } from '../lib/safeStorage';

interface NotificationPrefs {
  // Push
  pushEnabled: boolean;
  soundEnabled: boolean;
  // Types
  executionComplete: boolean;
  errors: boolean;
  agentMessages: boolean;
  systemUpdates: boolean;
  // Email
  dailySummary: boolean;
  criticalAlerts: boolean;
}

interface NotificationPrefsState extends NotificationPrefs {
  setPref: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => void;
  resetPrefs: () => void;
}

const defaults: NotificationPrefs = {
  pushEnabled: true,
  soundEnabled: false,
  executionComplete: true,
  errors: true,
  agentMessages: true,
  systemUpdates: false,
  dailySummary: false,
  criticalAlerts: true,
};

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      ...defaults,
      setPref: (key, value) => set({ [key]: value }),
      resetPrefs: () => set(defaults),
    }),
    {
      name: 'aios-notification-prefs',
      storage: safePersistStorage,
    }
  )
);
