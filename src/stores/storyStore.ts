import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safePersistStorage } from '../lib/safeStorage';

export type StoryStatus =
  | 'backlog'
  | 'in_progress'
  | 'ai_review'
  | 'human_review'
  | 'pr_created'
  | 'done'
  | 'error';

export interface Story {
  id: string;
  title: string;
  description?: string;
  status: StoryStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'standard' | 'complex';
  category: 'feature' | 'fix' | 'refactor' | 'docs';
  assignedAgent?: string;
  epicId?: string;
  acceptanceCriteria?: string[];
  technicalNotes?: string;
  progress: number;
  bobOrchestrated?: boolean;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryState {
  stories: Story[];
  storyOrder: Record<StoryStatus, string[]>;
  draggedStoryId: string | null;
  statusFilter: StoryStatus | null;
  epicFilter: string | null;
  searchQuery: string;
}

export interface StoryActions {
  addStory: (story: Story) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  moveStory: (storyId: string, newStatus: StoryStatus) => void;
  reorderStory: (status: StoryStatus, oldIndex: number, newIndex: number) => void;
  setDraggedStory: (storyId: string | null) => void;
  setStories: (stories: Story[]) => void;
  setStatusFilter: (status: StoryStatus | null) => void;
  setEpicFilter: (epicId: string | null) => void;
  setSearchQuery: (query: string) => void;
  getFilteredStories: () => Story[];
}

function buildOrderFromStories(stories: Story[]): Record<StoryStatus, string[]> {
  const order: Record<StoryStatus, string[]> = {
    backlog: [],
    in_progress: [],
    ai_review: [],
    human_review: [],
    pr_created: [],
    done: [],
    error: [],
  };

  for (const story of stories) {
    if (order[story.status]) {
      order[story.status].push(story.id);
    }
  }

  return order;
}

// Sample stories shown when no persisted data exists and API is unavailable.
// Mirrors the FALLBACK_STORIES in useStories.ts but lives at the store level
// so the Kanban board has content even before the React Query hook resolves.
const sampleStories: Story[] = [
  {
    id: 'story-001',
    title: 'Implement SSE streaming for agent responses',
    description: 'Add Server-Sent Events support to enable real-time streaming of agent responses to the dashboard.',
    status: 'backlog',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    progress: 0,
    createdAt: '2026-02-18T10:00:00Z',
    updatedAt: '2026-02-18T10:00:00Z',
  },
  {
    id: 'story-002',
    title: 'Add MCP health monitoring dashboard panel',
    description: 'Create a dedicated panel showing real-time health status of all 25 MCP servers with latency metrics.',
    status: 'backlog',
    priority: 'medium',
    complexity: 'standard',
    category: 'feature',
    assignedAgent: 'aios-dev',
    progress: 0,
    createdAt: '2026-02-17T14:30:00Z',
    updatedAt: '2026-02-17T14:30:00Z',
  },
  {
    id: 'story-004',
    title: 'Build Kanban board with drag-and-drop',
    description: 'Implement a full Kanban board for story management with dnd-kit drag-and-drop, 7 status columns, and persistence.',
    status: 'in_progress',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    epicId: 'epic-dashboard-v2',
    progress: 65,
    bobOrchestrated: true,
    createdAt: '2026-02-19T08:00:00Z',
    updatedAt: '2026-02-20T11:30:00Z',
  },
  {
    id: 'story-005',
    title: 'Wire dashboard metrics to real Supabase data',
    description: 'Replace mock data in dashboard panels with live queries from Supabase RPC functions.',
    status: 'in_progress',
    priority: 'high',
    complexity: 'standard',
    category: 'feature',
    assignedAgent: 'aios-dev',
    progress: 40,
    createdAt: '2026-02-19T09:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 'story-006',
    title: 'Add SYNAPSE context injection debug panel',
    description: 'Create a debug view that shows all 8 SYNAPSE layers and which domains are active for the current agent session.',
    status: 'ai_review',
    priority: 'medium',
    complexity: 'standard',
    category: 'feature',
    assignedAgent: 'aios-qa',
    progress: 90,
    createdAt: '2026-02-18T11:00:00Z',
    updatedAt: '2026-02-20T09:00:00Z',
  },
  {
    id: 'story-008',
    title: 'Implement Bob orchestration timeline visualization',
    description: 'A timeline view showing Bob orchestration events: task delegation, agent responses, decision points, and completion.',
    status: 'human_review',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    bobOrchestrated: true,
    progress: 100,
    createdAt: '2026-02-17T08:00:00Z',
    updatedAt: '2026-02-20T07:00:00Z',
  },
  {
    id: 'story-009',
    title: 'Add keyboard shortcuts overlay component',
    description: 'Global keyboard shortcuts help overlay triggered by ? key, showing all available shortcuts per view.',
    status: 'pr_created',
    priority: 'medium',
    complexity: 'simple',
    category: 'feature',
    assignedAgent: 'aios-dev',
    filePath: 'src/components/ui/KeyboardShortcuts.tsx',
    progress: 100,
    createdAt: '2026-02-16T10:00:00Z',
    updatedAt: '2026-02-19T16:00:00Z',
  },
  {
    id: 'story-010',
    title: 'Create glass morphism design system foundation',
    description: 'Build the core UI component library with glass morphism styling: GlassCard, GlassButton, GlassInput, Badge, Dialog.',
    status: 'done',
    priority: 'critical',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    progress: 100,
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-02-14T17:00:00Z',
  },
  {
    id: 'story-011',
    title: 'Set up Vite + React 19 + TanStack Query project scaffold',
    description: 'Initialize the aios-platform project with Vite, React 19, TanStack Query, Zustand, Tailwind, and Framer Motion.',
    status: 'done',
    priority: 'critical',
    complexity: 'standard',
    category: 'feature',
    assignedAgent: 'aios-dev',
    progress: 100,
    createdAt: '2026-02-08T09:00:00Z',
    updatedAt: '2026-02-10T12:00:00Z',
  },
  {
    id: 'story-013',
    title: 'Integrate COA analysis results into dashboard',
    description: 'Pull COA analysis data from Supabase and display in a dedicated panel with action recommendations.',
    status: 'error',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    technicalNotes: 'RPC function product_intelligence_overview returns 404. Migration pending.',
    progress: 30,
    createdAt: '2026-02-19T14:00:00Z',
    updatedAt: '2026-02-20T10:30:00Z',
  },
];

// Track in-progress operations to prevent race conditions
const inProgressOps = new Set<string>();

function withGuard(opKey: string, fn: () => void): void {
  if (inProgressOps.has(opKey)) return;
  inProgressOps.add(opKey);
  try {
    fn();
  } finally {
    inProgressOps.delete(opKey);
  }
}

export const useStoryStore = create<StoryState & StoryActions>()(
  persist(
    (set, get) => ({
      // State
      stories: [] as Story[],
      storyOrder: buildOrderFromStories([]),
      draggedStoryId: null,
      statusFilter: null,
      epicFilter: null,
      searchQuery: '',

      // Actions
      addStory: (story) =>
        withGuard(`add-${story.id}`, () => {
          set((state) => {
            const stories = [...state.stories, story];
            const storyOrder = { ...state.storyOrder };
            storyOrder[story.status] = [...(storyOrder[story.status] || []), story.id];
            return { stories, storyOrder };
          });
        }),

      updateStory: (id, updates) =>
        withGuard(`update-${id}`, () => {
          set((state) => {
            const stories = state.stories.map((s) =>
              s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
            );
            // If status changed, rebuild order
            const statusChanged = updates.status !== undefined;
            const storyOrder = statusChanged ? buildOrderFromStories(stories) : state.storyOrder;
            return { stories, storyOrder };
          });
        }),

      deleteStory: (id) =>
        withGuard(`delete-${id}`, () => {
          set((state) => {
            const stories = state.stories.filter((s) => s.id !== id);
            const storyOrder = buildOrderFromStories(stories);
            return { stories, storyOrder };
          });
        }),

      moveStory: (storyId, newStatus) =>
        withGuard(`move-${storyId}`, () => {
          set((state) => {
            const story = state.stories.find((s) => s.id === storyId);
            if (!story || story.status === newStatus) return state;

            const oldStatus = story.status;
            const stories = state.stories.map((s) =>
              s.id === storyId
                ? { ...s, status: newStatus, updatedAt: new Date().toISOString() }
                : s
            );

            const storyOrder = { ...state.storyOrder };
            // Remove from old column
            storyOrder[oldStatus] = (storyOrder[oldStatus] || []).filter(
              (sid) => sid !== storyId
            );
            // Add to new column
            storyOrder[newStatus] = [...(storyOrder[newStatus] || []), storyId];

            return { stories, storyOrder };
          });
        }),

      reorderStory: (status, oldIndex, newIndex) =>
        withGuard(`reorder-${status}`, () => {
          set((state) => {
            const currentOrder = [...(state.storyOrder[status] || [])];
            if (oldIndex < 0 || oldIndex >= currentOrder.length) return state;
            if (newIndex < 0 || newIndex >= currentOrder.length) return state;

            const [removed] = currentOrder.splice(oldIndex, 1);
            currentOrder.splice(newIndex, 0, removed);

            return {
              storyOrder: { ...state.storyOrder, [status]: currentOrder },
            };
          });
        }),

      setDraggedStory: (storyId) => set({ draggedStoryId: storyId }),

      setStories: (stories) =>
        set({
          stories,
          storyOrder: buildOrderFromStories(stories),
        }),

      setStatusFilter: (status) => set({ statusFilter: status }),
      setEpicFilter: (epicId) => set({ epicFilter: epicId }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      getFilteredStories: (): Story[] => {
        const { stories, statusFilter, epicFilter, searchQuery } = get();
        let filtered: Story[] = stories;

        if (statusFilter) {
          filtered = filtered.filter((s: Story) => s.status === statusFilter);
        }

        if (epicFilter) {
          filtered = filtered.filter((s: Story) => s.epicId === epicFilter);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          filtered = filtered.filter(
            (s: Story) =>
              s.title.toLowerCase().includes(q) ||
              s.id.toLowerCase().includes(q) ||
              (s.description && s.description.toLowerCase().includes(q))
          );
        }

        return filtered;
      },
    }),
    {
      name: 'aios-story-store',
      storage: safePersistStorage,
      partialize: (state) => ({
        stories: state.stories,
        storyOrder: state.storyOrder,
        statusFilter: state.statusFilter,
        epicFilter: state.epicFilter,
        searchQuery: state.searchQuery,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<StoryState> | undefined;
        // If persisted data has stories, use them; otherwise fall back to sample data
        const stories =
          persistedState?.stories && persistedState.stories.length > 0
            ? persistedState.stories
            : sampleStories;
        const storyOrder =
          persistedState?.storyOrder &&
          Object.values(persistedState.storyOrder).some((ids) => ids.length > 0)
            ? persistedState.storyOrder
            : buildOrderFromStories(stories);
        return {
          ...current,
          ...persistedState,
          stories,
          storyOrder,
        };
      },
    }
  )
);
