import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation issues in tests
const motionProps = ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileFocus', 'whileInView', 'layout', 'layoutId', 'custom', 'onAnimationStart', 'onAnimationComplete'];
function stripMotion(props: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const k of Object.keys(props)) {
    if (!motionProps.includes(k)) clean[k] = props[k];
  }
  return clean;
}
const tag = (Tag: string) => ({ children, ...props }: Record<string, unknown>) => {
  const p = stripMotion(props);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const El = Tag as any;
  return <El {...p}>{children}</El>;
};
vi.mock('framer-motion', () => ({
  motion: {
    div: tag('div'), button: tag('button'), span: tag('span'),
    svg: tag('svg'), circle: tag('circle'), g: tag('g'),
    tr: tag('tr'), path: tag('path'), line: tag('line'), text: tag('text'),
  },
  AnimatePresence: ({ children }: { children?: unknown }) => <>{children}</>,
}));

// Mock storyStore
const mockStories = [
  {
    id: 'story-001',
    title: 'Implement SSE streaming',
    description: 'Add Server-Sent Events support for real-time streaming.',
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
    title: 'Build Kanban board',
    description: 'Implement a full Kanban board for story management.',
    status: 'in_progress',
    priority: 'high',
    complexity: 'standard',
    category: 'feature',
    assignedAgent: 'aios-dev',
    progress: 65,
    bobOrchestrated: true,
    createdAt: '2026-02-19T08:00:00Z',
    updatedAt: '2026-02-20T11:30:00Z',
  },
];

vi.mock('../../../stores/storyStore', () => ({
  useStoryStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      stories: mockStories,
      storyOrder: {
        backlog: ['story-001'],
        in_progress: ['story-002'],
        ai_review: [],
        human_review: [],
        pr_created: [],
        done: [],
        error: [],
      },
      draggedStoryId: null,
      statusFilter: null,
      epicFilter: null,
      searchQuery: '',
      addStory: vi.fn(),
      updateStory: vi.fn(),
      deleteStory: vi.fn(),
      moveStory: vi.fn(),
      reorderStory: vi.fn(),
      setDraggedStory: vi.fn(),
      setStories: vi.fn(),
      setStatusFilter: vi.fn(),
      setEpicFilter: vi.fn(),
      setSearchQuery: vi.fn(),
      getFilteredStories: () => mockStories,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock the KanbanBoard used by StoryWorkspace
vi.mock('../../kanban/KanbanBoard', () => ({
  __esModule: true,
  default: ({ viewToggle }: { viewToggle?: unknown }) => (
    <div data-testid="kanban-board">
      {viewToggle}
      <span>Kanban Board Mock</span>
    </div>
  ),
}));

// Mock the modals used by StoryList
vi.mock('../StoryDetailModal', () => ({
  StoryDetailModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="story-detail-modal">Detail Modal</div> : null,
}));

vi.mock('../StoryCreateModal', () => ({
  StoryCreateModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="story-create-modal">Create Modal</div> : null,
}));

describe('Stories Components — render tests', () => {
  beforeEach(() => { vi.resetModules(); });

  describe('StoryWorkspace', () => {
    it('renders without crashing in board mode (default)', async () => {
      const { default: StoryWorkspace } = await import('../StoryWorkspace');
      render(<StoryWorkspace />);
      // Default view is board, which renders KanbanBoard
      expect(screen.getAllByText(/Kanban Board Mock/i).length).toBeGreaterThan(0);
    });

    it('shows view toggle buttons', async () => {
      const { default: StoryWorkspace } = await import('../StoryWorkspace');
      render(<StoryWorkspace />);
      // Should show Board and Lista toggle options
      expect(screen.getAllByText(/Board/i).length).toBeGreaterThan(0);
    });
  });

  describe('StoryCard', () => {
    it('renders a feature story card without crashing', async () => {
      const { StoryCard } = await import('../StoryCard');
      const story = {
        id: 'story-test-1',
        title: 'Test Feature Story',
        description: 'A description for the test story.',
        status: 'in_progress' as const,
        priority: 'high' as const,
        complexity: 'standard' as const,
        category: 'feature' as const,
        assignedAgent: 'aios-dev',
        progress: 50,
        createdAt: '2026-02-18T10:00:00Z',
        updatedAt: '2026-02-18T10:00:00Z',
      };
      render(<StoryCard story={story} />);
      expect(screen.getAllByText(/Test Feature Story/i).length).toBeGreaterThan(0);
    });

    it('shows category and complexity badges', async () => {
      const { StoryCard } = await import('../StoryCard');
      const story = {
        id: 'story-test-2',
        title: 'Refactor Utils Module',
        status: 'backlog' as const,
        priority: 'medium' as const,
        complexity: 'simple' as const,
        category: 'refactor' as const,
        progress: 0,
        createdAt: '2026-02-18T10:00:00Z',
        updatedAt: '2026-02-18T10:00:00Z',
      };
      render(<StoryCard story={story} />);
      expect(screen.getAllByText(/Refactor/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/simple/i).length).toBeGreaterThan(0);
    });

    it('shows BOB badge when bobOrchestrated is true', async () => {
      const { StoryCard } = await import('../StoryCard');
      const story = {
        id: 'story-test-3',
        title: 'Orchestrated Story',
        status: 'in_progress' as const,
        priority: 'high' as const,
        complexity: 'complex' as const,
        category: 'feature' as const,
        progress: 80,
        bobOrchestrated: true,
        createdAt: '2026-02-18T10:00:00Z',
        updatedAt: '2026-02-18T10:00:00Z',
      };
      render(<StoryCard story={story} />);
      expect(screen.getAllByText(/BOB/i).length).toBeGreaterThan(0);
    });

    it('shows assigned agent badge', async () => {
      const { StoryCard } = await import('../StoryCard');
      const story = {
        id: 'story-test-4',
        title: 'Assigned Story',
        status: 'ai_review' as const,
        priority: 'medium' as const,
        complexity: 'standard' as const,
        category: 'feature' as const,
        assignedAgent: 'aios-qa',
        progress: 90,
        createdAt: '2026-02-18T10:00:00Z',
        updatedAt: '2026-02-18T10:00:00Z',
      };
      render(<StoryCard story={story} />);
      expect(screen.getAllByText(/aios-qa/i).length).toBeGreaterThan(0);
    });
  });

  describe('StoryList', () => {
    it('renders without crashing', async () => {
      const { StoryList } = await import('../StoryList');
      render(<StoryList />);
      // Should show the "Stories" section label
      expect(screen.getAllByText(/Stories/i).length).toBeGreaterThan(0);
    });

    it('shows search input', async () => {
      const { StoryList } = await import('../StoryList');
      const { container } = render(<StoryList />);
      expect(container.querySelector('input')).toBeTruthy();
    });

    it('shows status filter buttons', async () => {
      const { StoryList } = await import('../StoryList');
      render(<StoryList />);
      // Should show filter labels from statusFilters
      expect(screen.getAllByText(/Backlog/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Done/i).length).toBeGreaterThan(0);
    });

    it('renders story cards from store', async () => {
      const { StoryList } = await import('../StoryList');
      render(<StoryList />);
      // Should show story titles from mockStories
      expect(screen.getAllByText(/Implement SSE streaming/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Build Kanban board/i).length).toBeGreaterThan(0);
    });

    it('shows create story button', async () => {
      const { StoryList } = await import('../StoryList');
      render(<StoryList />);
      expect(screen.getAllByText(/Criar Story/i).length).toBeGreaterThan(0);
    });
  });
});
