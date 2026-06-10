import { create } from 'zustand';

export interface PresenceUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
  currentView: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
}

interface PresenceState {
  users: PresenceUser[];
  showCursors: boolean;
  setShowCursors: (show: boolean) => void;
}

// Simulated team members for demo
const DEMO_USERS: PresenceUser[] = [
  { id: 'u1', name: 'Ana Silva', avatar: 'AS', color: '#8B5CF6', currentView: 'stories', lastSeen: Date.now() },
  { id: 'u2', name: 'Carlos Lima', avatar: 'CL', color: '#3B82F6', currentView: 'dashboard', lastSeen: Date.now() - 30000 },
  { id: 'u3', name: 'Marina Rocha', avatar: 'MR', color: '#10B981', currentView: 'chat', lastSeen: Date.now() - 120000 },
];

export const usePresenceStore = create<PresenceState>((set) => ({
  users: DEMO_USERS,
  showCursors: true,
  setShowCursors: (show) => set({ showCursors: show }),
}));

// Simulate random view changes every 15-30s
if (typeof window !== 'undefined') {
  const views = ['chat', 'stories', 'dashboard', 'monitor', 'roadmap'];
  setInterval(() => {
    usePresenceStore.setState((state) => ({
      users: state.users.map((u) =>
        Math.random() > 0.7
          ? { ...u, currentView: views[Math.floor(Math.random() * views.length)], lastSeen: Date.now() }
          : u
      ),
    }));
  }, 20000);
}
