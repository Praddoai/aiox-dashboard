import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { StoryList } from './StoryList';
import { useStoryStore } from '../../stores/storyStore';
import type { Story as StoryType } from '../../stores/storyStore';

const mockStories: StoryType[] = [
  {
    id: 'story-sl-001',
    title: 'Build agent chat interface',
    description: 'Create the main chat UI for interacting with AI agents.',
    status: 'in_progress',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    progress: 60,
    createdAt: '2026-02-18T10:00:00Z',
    updatedAt: '2026-02-25T14:00:00Z',
  },
  {
    id: 'story-sl-002',
    title: 'Fix WebSocket reconnection logic',
    description: 'Auto-reconnect fails after 3 attempts.',
    status: 'backlog',
    priority: 'critical',
    complexity: 'standard',
    category: 'fix',
    progress: 0,
    createdAt: '2026-02-20T08:00:00Z',
    updatedAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'story-sl-003',
    title: 'Refactor API service layer',
    status: 'ai_review',
    priority: 'medium',
    complexity: 'standard',
    category: 'refactor',
    assignedAgent: 'aios-architect',
    bobOrchestrated: true,
    progress: 85,
    createdAt: '2026-02-16T09:00:00Z',
    updatedAt: '2026-02-24T16:00:00Z',
  },
  {
    id: 'story-sl-004',
    title: 'Update squad configuration docs',
    status: 'done',
    priority: 'low',
    complexity: 'simple',
    category: 'docs',
    progress: 100,
    createdAt: '2026-02-14T12:00:00Z',
    updatedAt: '2026-02-22T11:00:00Z',
  },
  {
    id: 'story-sl-005',
    title: 'Add error boundary to chat view',
    description: 'Wrap chat components in error boundaries for graceful failure handling.',
    status: 'human_review',
    priority: 'medium',
    complexity: 'simple',
    category: 'feature',
    assignedAgent: 'aios-qa',
    progress: 90,
    createdAt: '2026-02-19T11:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z',
  },
  {
    id: 'story-sl-006',
    title: 'Deployment pipeline for staging',
    status: 'pr_created',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-devops',
    progress: 95,
    createdAt: '2026-02-17T07:00:00Z',
    updatedAt: '2026-02-25T08:00:00Z',
  },
];

function StoryListWithData() {
  const setStories = useStoryStore((s) => s.setStories);
  const setSearchQuery = useStoryStore((s) => s.setSearchQuery);
  const setStatusFilter = useStoryStore((s) => s.setStatusFilter);

  useEffect(() => {
    setStories(mockStories);
    setSearchQuery('');
    setStatusFilter(null);
  }, [setStories, setSearchQuery, setStatusFilter]);

  return <StoryList />;
}

function EmptyStoryList() {
  const setStories = useStoryStore((s) => s.setStories);
  const setSearchQuery = useStoryStore((s) => s.setSearchQuery);
  const setStatusFilter = useStoryStore((s) => s.setStatusFilter);

  useEffect(() => {
    setStories([]);
    setSearchQuery('');
    setStatusFilter(null);
  }, [setStories, setSearchQuery, setStatusFilter]);

  return <StoryList />;
}

const meta = {
  title: 'Stories/StoryList',
  component: StoryList,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Grid list view of stories with search, status filtering, and create/detail modals. Uses Zustand store for state management. Stories are displayed as interactive cards in a responsive grid.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta satisfies Meta<typeof StoryList>;
type Story = StoryObj<typeof meta>;

export const WithStories: Story = {
  args: {},
  render: () => (
    <div style={{ padding: 24, height: '100vh' }}>
      <StoryListWithData />
    </div>
  ),
};

export const Empty: Story = {
  args: {},
  render: () => (
    <div style={{ padding: 24, height: '100vh' }}>
      <EmptyStoryList />
    </div>
  ),
};
