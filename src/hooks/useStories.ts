import { useQuery } from '@tanstack/react-query';
import { useStoryStore, type Story, type StoryState, type StoryActions } from '../stores/storyStore';

type StoryStore = StoryState & StoryActions;
import { useEffect } from 'react';

// Fallback stories used when the /api/stories endpoint is unavailable.
// Ensures the Kanban board always has visual content during development.
const FALLBACK_STORIES: Story[] = [
  {
    id: 'story-001',
    title: 'Implement SSE streaming for agent responses',
    description:
      'Add Server-Sent Events support to enable real-time streaming of agent responses to the dashboard.',
    status: 'backlog',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    acceptanceCriteria: [
      'SSE connection established on agent execute',
      'Tokens stream in real-time to the UI',
      'Connection auto-reconnects on failure',
      'Backpressure handling for slow clients',
    ],
    technicalNotes: 'Use EventSource API with polyfill for older browsers.',
    progress: 0,
    createdAt: '2026-02-18T10:00:00Z',
    updatedAt: '2026-02-18T10:00:00Z',
  },
  {
    id: 'story-002',
    title: 'Add MCP health monitoring dashboard panel',
    description:
      'Create a dedicated panel showing real-time health status of all 25 MCP servers with latency metrics.',
    status: 'backlog',
    priority: 'medium',
    complexity: 'standard',
    category: 'feature',
    assignedAgent: 'aios-dev',
    acceptanceCriteria: [
      'Shows all MCP servers with connection status',
      'Displays average latency per server',
      'Alert badges for degraded/offline servers',
    ],
    progress: 0,
    createdAt: '2026-02-17T14:30:00Z',
    updatedAt: '2026-02-17T14:30:00Z',
  },
  {
    id: 'story-003',
    title: 'Refactor agent execution queue with priority lanes',
    description:
      'Replace the simple FIFO queue with a multi-lane priority system for agent task execution.',
    status: 'backlog',
    priority: 'low',
    complexity: 'complex',
    category: 'refactor',
    technicalNotes: 'Consider using a min-heap for O(log n) priority extraction.',
    progress: 0,
    createdAt: '2026-02-16T09:00:00Z',
    updatedAt: '2026-02-16T09:00:00Z',
  },
  {
    id: 'story-004',
    title: 'Build Kanban board with drag-and-drop',
    description:
      'Implement a full Kanban board for story management with dnd-kit drag-and-drop, 7 status columns, and persistence.',
    status: 'in_progress',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    epicId: 'epic-dashboard-v2',
    acceptanceCriteria: [
      'Drag stories between columns to change status',
      'Reorder stories within the same column',
      'Visual drag overlay with rotation effect',
      'Persist state to localStorage',
    ],
    progress: 65,
    bobOrchestrated: true,
    createdAt: '2026-02-19T08:00:00Z',
    updatedAt: '2026-02-20T11:30:00Z',
  },
  {
    id: 'story-005',
    title: 'Wire dashboard metrics to real Supabase data',
    description:
      'Replace mock data in dashboard panels with live queries from Supabase RPC functions.',
    status: 'in_progress',
    priority: 'high',
    complexity: 'standard',
    category: 'feature',
    assignedAgent: 'aios-dev',
    acceptanceCriteria: [
      'All metric cards use real data',
      'Graceful fallback on query failure',
      'Loading skeletons during fetch',
    ],
    progress: 40,
    createdAt: '2026-02-19T09:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 'story-006',
    title: 'Add SYNAPSE context injection debug panel',
    description:
      'Create a debug view that shows all 8 SYNAPSE layers and which domains are active for the current agent session.',
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
    id: 'story-007',
    title: 'Fix agent avatar gradient misalignment in dark mode',
    description:
      'Avatar gradients show incorrect colors in dark mode due to CSS variable inheritance issue.',
    status: 'ai_review',
    priority: 'low',
    complexity: 'simple',
    category: 'fix',
    assignedAgent: 'aios-qa',
    progress: 95,
    createdAt: '2026-02-19T15:00:00Z',
    updatedAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'story-008',
    title: 'Implement Bob orchestration timeline visualization',
    description:
      'A timeline view showing Bob orchestration events: task delegation, agent responses, decision points, and completion.',
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
    description:
      'Global keyboard shortcuts help overlay triggered by ? key, showing all available shortcuts per view.',
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
    description:
      'Build the core UI component library with glass morphism styling: GlassCard, GlassButton, GlassInput, Badge, Dialog.',
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
    description:
      'Initialize the aios-platform project with Vite, React 19, TanStack Query, Zustand, Tailwind, and Framer Motion.',
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
    id: 'story-012',
    title: 'Document Zustand store patterns for agent state',
    description:
      'Write internal documentation for the Zustand store conventions used across the platform.',
    status: 'done',
    priority: 'low',
    complexity: 'simple',
    category: 'docs',
    progress: 100,
    createdAt: '2026-02-15T13:00:00Z',
    updatedAt: '2026-02-16T11:00:00Z',
  },
  {
    id: 'story-013',
    title: 'Integrate COA analysis results into dashboard',
    description:
      'Pull COA (Campaign Optimization Autopilot) analysis data from Supabase and display in a dedicated panel with action recommendations.',
    status: 'error',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    technicalNotes:
      'RPC function product_intelligence_overview returns 404. Migration pending.',
    progress: 30,
    createdAt: '2026-02-19T14:00:00Z',
    updatedAt: '2026-02-20T10:30:00Z',
  },
];

export function useStories() {
  const setStories = useStoryStore((s: StoryStore) => s.setStories);
  const stories = useStoryStore((s: StoryStore) => s.stories);

  const query = useQuery({
    queryKey: ['stories'],
    queryFn: async (): Promise<Story[]> => {
      try {
        const res = await fetch('/api/stories');
        if (!res.ok) throw new Error(`Failed to fetch stories: ${res.status}`);
        return res.json();
      } catch {
        // API unavailable — silently fall back to demo data
        return FALLBACK_STORIES;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry — fallback data is returned on failure
  });

  // Sync fetched data into Zustand store
  useEffect(() => {
    if (query.data && query.data.length > 0 && stories.length === 0) {
      setStories(query.data);
    }
  }, [query.data, setStories, stories.length]);

  return {
    stories: stories.length > 0 ? stories : query.data ?? [],
    isLoading: query.isLoading && stories.length === 0,
    error: query.error,
    refetch: query.refetch,
  };
}
