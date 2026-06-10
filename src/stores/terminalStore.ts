import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safePersistStorage } from '../lib/safeStorage';
import type { TerminalSession } from '../components/terminals/TerminalCard';

const MAX_OUTPUT_LINES = 500;

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  appendOutput: (sessionId: string, lines: string[]) => void;
  clearOutput: (sessionId: string) => void;
  setSessions: (sessions: TerminalSession[]) => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      sessions: [],
      activeSessionId: null,

      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
        })),

      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        })),

      setActiveSession: (id) => set({ activeSessionId: id }),

      appendOutput: (sessionId, lines) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const combined = [...s.output, ...lines];
            return {
              ...s,
              output: combined.length > MAX_OUTPUT_LINES
                ? combined.slice(combined.length - MAX_OUTPUT_LINES)
                : combined,
            };
          }),
        })),

      clearOutput: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, output: [] } : s
          ),
        })),

      setSessions: (sessions) => set({ sessions }),
    }),
    {
      name: 'aios-terminal-store',
      storage: safePersistStorage,
      partialize: (state) => ({
        sessions: state.sessions,
      }),
    }
  )
);
