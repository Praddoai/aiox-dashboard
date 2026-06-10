import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safePersistStorage } from '../lib/safeStorage';

export type WidgetId =
  | 'metrics'
  | 'executionChart'
  | 'statusDonut'
  | 'healthCards'
  | 'agentRanking'
  | 'commandChart'
  | 'mcpServers'
  | 'costs'
  | 'systemInfo';

export interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
  order: number;
}

const defaultWidgets: WidgetConfig[] = [
  { id: 'metrics', label: 'Metric Cards', visible: true, order: 0 },
  { id: 'executionChart', label: 'Execution Trend', visible: true, order: 1 },
  { id: 'statusDonut', label: 'Status Distribution', visible: true, order: 2 },
  { id: 'healthCards', label: 'Health Cards', visible: true, order: 3 },
  { id: 'agentRanking', label: 'Agent Ranking', visible: true, order: 4 },
  { id: 'commandChart', label: 'Command Analytics', visible: true, order: 5 },
  { id: 'mcpServers', label: 'MCP Servers', visible: true, order: 6 },
  { id: 'costs', label: 'Cost Overview', visible: true, order: 7 },
  { id: 'systemInfo', label: 'System Info', visible: true, order: 8 },
];

interface DashboardWidgetState {
  widgets: WidgetConfig[];
  customizing: boolean;
  toggleWidget: (id: WidgetId) => void;
  moveWidget: (id: WidgetId, direction: 'up' | 'down') => void;
  resetWidgets: () => void;
  setCustomizing: (val: boolean) => void;
  isVisible: (id: WidgetId) => boolean;
}

export const useDashboardWidgetStore = create<DashboardWidgetState>()(
  persist(
    (set, get) => ({
      widgets: defaultWidgets,
      customizing: false,

      toggleWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w
          ),
        })),

      moveWidget: (id, direction) =>
        set((state) => {
          const sorted = [...state.widgets].sort((a, b) => a.order - b.order);
          const idx = sorted.findIndex((w) => w.id === id);
          if (idx < 0) return state;
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= sorted.length) return state;
          const tempOrder = sorted[idx].order;
          sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
          sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };
          return { widgets: sorted };
        }),

      resetWidgets: () => set({ widgets: defaultWidgets }),

      setCustomizing: (val) => set({ customizing: val }),

      isVisible: (id) => {
        const w = get().widgets.find((w) => w.id === id);
        return w?.visible ?? true;
      },
    }),
    {
      name: 'aios-dashboard-widgets',
      storage: safePersistStorage,
      partialize: (state) => ({ widgets: state.widgets }),
    }
  )
);
