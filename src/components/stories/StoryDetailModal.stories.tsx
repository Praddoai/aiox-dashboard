import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StoryDetailModal } from './StoryDetailModal';
import type { Story as StoryType } from '../../stores/storyStore';

const fullStory: StoryType = {
  id: 'story-sdm-001',
  title: 'Implement real-time agent monitoring dashboard',
  description:
    'Build a comprehensive monitoring view that displays live agent statuses, execution metrics, and error rates across all squads.',
  status: 'human_review',
  priority: 'high',
  complexity: 'complex',
  category: 'feature',
  assignedAgent: 'aios-architect',
  epicId: 'EPIC-5',
  acceptanceCriteria: [
    'Dashboard updates in real-time via SSE',
    'Shows per-agent execution count and success rate',
    'Includes error log panel with filtering',
    'Responsive layout for desktop and tablet',
  ],
  technicalNotes:
    'Use React Query for polling fallback. SSE connection managed via custom hook. Consider WebSocket upgrade in v2.',
  progress: 75,
  bobOrchestrated: true,
  createdAt: '2026-02-15T08:00:00Z',
  updatedAt: '2026-02-25T17:00:00Z',
};

const minimalStory: StoryType = {
  id: 'story-sdm-002',
  title: 'Fix typo in error messages',
  status: 'backlog',
  priority: 'low',
  complexity: 'simple',
  category: 'fix',
  progress: 0,
  createdAt: '2026-02-24T10:00:00Z',
  updatedAt: '2026-02-24T10:00:00Z',
};

const meta: Meta<typeof StoryDetailModal> = {
  title: 'Stories/StoryDetailModal',
  component: StoryDetailModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Read-only modal for viewing story details in the stories list view. Displays status badges, description, acceptance criteria, technical notes, and timestamps.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    story: {
      control: false,
      description: 'The story to display (null hides content)',
    },
    isOpen: {
      control: 'boolean',
      description: 'Controls modal visibility',
    },
    onClose: {
      description: 'Callback when the modal is closed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FullDetails: Story = {
  args: {
    isOpen: true,
    story: fullStory,
    onClose: fn(),
  },
};

export const MinimalStory: Story = {
  args: {
    isOpen: true,
    story: minimalStory,
    onClose: fn(),
  },
};

export const CompletedStory: Story = {
  args: {
    isOpen: true,
    story: {
      ...fullStory,
      id: 'story-sdm-003',
      status: 'done',
      progress: 100,
      title: 'Completed: Squad configuration migration',
      assignedAgent: 'aios-devops',
    },
    onClose: fn(),
  },
};

export const WithEpic: Story = {
  args: {
    isOpen: true,
    story: {
      ...fullStory,
      id: 'story-sdm-004',
      epicId: 'EPIC-7',
      status: 'pr_created',
      progress: 95,
    },
    onClose: fn(),
  },
};
