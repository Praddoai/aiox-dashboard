/**
 * Orchestration store.
 * Tracks background orchestration completions, badge display, toast triggers,
 * and live task state for the ActivityPanel.
 */
import { create } from 'zustand';

interface OrchestrationNotification {
  taskId: string;
  demand: string;
  status: 'completed' | 'failed';
  timestamp: number;
}

/** Serializable snapshot of the live orchestration task (no Map/Set). */
export interface OrchestrationTaskSnapshot {
  taskId: string | null;
  status: 'idle' | 'analyzing' | 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed';
  demand: string;
  squadSelections: Array<{
    squadId: string;
    chief: string;
    agentCount: number;
    agents: Array<{ id: string; name: string }>;
  }>;
  agentOutputs: Array<{
    stepId: string;
    stepName: string;
    agent: { id: string; name: string; squad: string };
    role: string;
    response: string;
    processingTimeMs: number;
    llmMetadata?: { provider: string; model: string; inputTokens?: number; outputTokens?: number };
  }>;
  streamingAgents: Array<{ agentId: string; agentName: string; squad: string; role: string }>;
  events: Array<{ event: string; timestamp?: string }>;
  error: string | null;
  startTime: number | null;
}

interface OrchestrationStore {
  /** Pending notifications not yet seen by the user */
  pending: OrchestrationNotification[];
  /** Whether an orchestration is currently running */
  isRunning: boolean;
  /** Badge count for the Bob nav item */
  badgeCount: number;
  /** Live task state snapshot for ActivityPanel consumption */
  liveTask: OrchestrationTaskSnapshot | null;

  /** Mark an orchestration as running */
  setRunning: (running: boolean) => void;
  /** Add a completion notification */
  addNotification: (notification: Omit<OrchestrationNotification, 'timestamp'>) => void;
  /** Clear all pending notifications (user viewed them) */
  clearPending: () => void;
  /** Dismiss a specific notification */
  dismiss: (taskId: string) => void;
  /** Update the live task snapshot */
  setLiveTask: (task: OrchestrationTaskSnapshot | null) => void;
}

export const useOrchestrationStore = create<OrchestrationStore>((set) => ({
  pending: [],
  isRunning: false,
  badgeCount: 0,
  liveTask: null,

  setRunning: (running) => set({ isRunning: running }),

  addNotification: (notification) =>
    set((state) => {
      const item = { ...notification, timestamp: Date.now() };
      const pending = [...state.pending, item];
      return { pending, badgeCount: pending.length, isRunning: false };
    }),

  clearPending: () => set({ pending: [], badgeCount: 0 }),

  dismiss: (taskId) =>
    set((state) => {
      const pending = state.pending.filter((n) => n.taskId !== taskId);
      return { pending, badgeCount: pending.length };
    }),

  setLiveTask: (task) => set({ liveTask: task }),
}));
