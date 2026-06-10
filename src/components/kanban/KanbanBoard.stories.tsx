import type { Meta, StoryObj } from '@storybook/react-vite';
import KanbanBoard from './KanbanBoard';
import { useStoryStore } from '../../stores/storyStore';
import type { Story as StoryType } from '../../stores/storyStore';
import { useEffect } from 'react';

const mockStories: StoryType[] = [
  {
    id: 'story-001',
    title: 'Implement SSE streaming for agent responses',
    description: 'Add server-sent events support for real-time agent output streaming.',
    status: 'backlog',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    progress: 0,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 'story-002',
    title: 'Fix token counting for Claude API',
    description: 'Token counter is off by ~10% for large payloads.',
    status: 'in_progress',
    priority: 'critical',
    complexity: 'standard',
    category: 'fix',
    assignedAgent: 'aios-dev',
    progress: 45,
    createdAt: '2026-02-19T08:00:00Z',
    updatedAt: '2026-02-25T14:00:00Z',
  },
  {
    id: 'story-003',
    title: 'Refactor squad configuration loader',
    status: 'ai_review',
    priority: 'medium',
    complexity: 'standard',
    category: 'refactor',
    assignedAgent: 'aios-architect',
    bobOrchestrated: true,
    progress: 80,
    createdAt: '2026-02-18T09:00:00Z',
    updatedAt: '2026-02-24T16:00:00Z',
  },
  {
    id: 'story-004',
    title: 'Add API documentation for orchestration endpoints',
    status: 'done',
    priority: 'low',
    complexity: 'simple',
    category: 'docs',
    progress: 100,
    createdAt: '2026-02-15T12:00:00Z',
    updatedAt: '2026-02-22T11:00:00Z',
  },
  {
    id: 'story-005',
    title: 'PR merge conflict in auth module',
    status: 'error',
    priority: 'high',
    complexity: 'standard',
    category: 'fix',
    assignedAgent: 'aios-devops',
    progress: 60,
    createdAt: '2026-02-21T07:00:00Z',
    updatedAt: '2026-02-25T09:00:00Z',
  },
];

function KanbanBoardWithData() {
  const setStories = useStoryStore((s) => s.setStories);

  useEffect(() => {
    setStories(mockStories);
  }, [setStories]);

  return <KanbanBoard />;
}

function EmptyKanbanBoard() {
  const setStories = useStoryStore((s) => s.setStories);

  useEffect(() => {
    setStories([]);
  }, [setStories]);

  return <KanbanBoard />;
}

const meta: Meta<typeof KanbanBoard> = {
  title: 'Kanban/KanbanBoard',
  component: KanbanBoard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full kanban board with drag-and-drop columns for managing story lifecycle stages. Supports creating, viewing, editing, and reordering stories across status columns.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ height: '100vh' }}>
      <KanbanBoardWithData />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ height: '100vh' }}>
      <EmptyKanbanBoard />
    </div>
  ),
};

export const WithManyStories: Story = {
  render: function ManyStoriesBoard() {
    const setStories = useStoryStore((s) => s.setStories);

    useEffect(() => {
      const statuses = ['backlog', 'in_progress', 'ai_review', 'human_review', 'pr_created', 'done'] as const;
      const categories = ['feature', 'fix', 'refactor', 'docs'] as const;
      const priorities = ['low', 'medium', 'high', 'critical'] as const;
      const complexities = ['simple', 'standard', 'complex'] as const;

      const stories: StoryType[] = Array.from({ length: 18 }, (_, i) => ({
        id: `story-m${i + 1}`,
        title: `Story ${i + 1}: ${['Build agent chat UI', 'Fix memory leak', 'Update docs', 'Refactor router', 'Add tests', 'Deploy pipeline'][i % 6]}`,
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        complexity: complexities[i % complexities.length],
        category: categories[i % categories.length],
        progress: Math.min(100, (i * 15) % 110),
        assignedAgent: i % 3 === 0 ? 'aios-dev' : i % 3 === 1 ? 'aios-qa' : undefined,
        createdAt: '2026-02-20T10:00:00Z',
        updatedAt: '2026-02-25T10:00:00Z',
      }));

      setStories(stories);
    }, [setStories]);

    return (
      <div style={{ height: '100vh' }}>
        <KanbanBoard />
      </div>
    );
  },
};
