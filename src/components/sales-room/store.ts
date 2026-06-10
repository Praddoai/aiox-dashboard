import { create } from 'zustand';
import type { SalesAgent, ActivityEvent, SalesMetrics, Message, ConnectionStatus } from './types';
import { INITIAL_AGENTS, INITIAL_ACTIVITIES, INITIAL_METRICS } from './seed';

interface SalesRoomState {
  agents: SalesAgent[];
  activities: ActivityEvent[];
  metrics: SalesMetrics;
  selectedAgentId: string;
  whatsappStatus: ConnectionStatus;
  simulationEnabled: boolean;

  // Actions
  selectAgent: (id: string) => void;
  addMessage: (agentId: string, message: Message) => void;
  addActivity: (activity: ActivityEvent) => void;
  updateAgentStatus: (agentId: string, status: SalesAgent['status']) => void;
  updateMetrics: (partial: Partial<SalesMetrics>) => void;
  setWhatsappStatus: (status: ConnectionStatus) => void;
  setSimulationEnabled: (enabled: boolean) => void;
  incrementMetric: (key: keyof SalesMetrics, amount?: number) => void;
}

export const useSalesStore = create<SalesRoomState>((set, _get) => ({
  agents: INITIAL_AGENTS,
  activities: INITIAL_ACTIVITIES,
  metrics: { ...INITIAL_METRICS },
  selectedAgentId: INITIAL_AGENTS[0].id,
  whatsappStatus: 'disconnected',
  simulationEnabled: true,

  selectAgent: (id) => set({ selectedAgentId: id }),

  addMessage: (agentId, message) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === agentId
        ? { ...a, messages: [...a.messages, message] }
        : a
    ),
  })),

  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities].slice(0, 50),
  })),

  updateAgentStatus: (agentId, status) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === agentId ? { ...a, status } : a
    ),
  })),

  updateMetrics: (partial) => set((state) => ({
    metrics: { ...state.metrics, ...partial },
  })),

  setWhatsappStatus: (status) => set({ whatsappStatus: status }),

  setSimulationEnabled: (enabled) => set({ simulationEnabled: enabled }),

  incrementMetric: (key, amount = 1) => set((state) => ({
    metrics: {
      ...state.metrics,
      [key]: (state.metrics[key] as number) + amount,
    },
  })),
}));
