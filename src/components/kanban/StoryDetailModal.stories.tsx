import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StoryDetailModal } from './StoryDetailModal';
import type { Story as StoryType } from '../../stores/storyStore';

const fullStory: StoryType = {
  id: 'story-det-001',
  title: 'Implement SSE streaming for agent responses',
  description:
    'Add server-sent events support for real-time agent output streaming. This enables progressive rendering of AI responses in the chat interface.',
  status: 'in_progress',
  priority: 'high',
  complexity: 'complex',
  category: 'feature',
  assignedAgent: 'aios-dev',
  epicId: 'EPIC-3',
  acceptanceCriteria: [
    'SSE endpoint responds with correct content-type',
    'Chat UI renders tokens as they arrive',
    'Connection auto-reconnects on failure',
    'Progress indicator shows streaming state',
  ],
  technicalNotes: 'Use EventSource API with polyfill for older browsers. Backend uses express-sse middleware.',
  progress: 65,
  bobOrchestrated: true,
  filePath: 'docs/stories/3.1.story.md',
  createdAt: '2026-02-18T09:00:00Z',
  updatedAt: '2026-02-25T16:30:00Z',
};

const minimalStory: StoryType = {
  id: 'story-det-002',
  title: 'Quick documentation fix',
  status: 'backlog',
  priority: 'low',
  complexity: 'simple',
  category: 'docs',
  progress: 0,
  createdAt: '2026-02-24T10:00:00Z',
  updatedAt: '2026-02-24T10:00:00Z',
};

const meta: Meta<typeof StoryDetailModal> = {
  title: 'Kanban/StoryDetailModal',
  component: StoryDetailModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal dialog showing full story details with read and edit modes. Supports viewing badges, description, acceptance criteria, technical notes, progress, and metadata. Includes edit and delete actions.',
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
    isOpen: {
      control: 'boolean',
      description: 'Controls modal visibility',
    },
    story: {
      control: false,
      description: 'The story to display (null hides content)',
    },
    onClose: {
      description: 'Callback when the modal is closed',
    },
    onUpdate: {
      description: 'Callback with story ID and partial updates',
    },
    onDelete: {
      description: 'Callback with story ID to delete',
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
    onUpdate: fn(),
    onDelete: fn(),
  },
};

export const MinimalStory: Story = {
  args: {
    isOpen: true,
    story: minimalStory,
    onClose: fn(),
    onUpdate: fn(),
    onDelete: fn(),
  },
};

export const CompletedStory: Story = {
  args: {
    isOpen: true,
    story: {
      ...fullStory,
      id: 'story-det-003',
      status: 'done',
      progress: 100,
      title: 'Completed feature: Agent chat integration',
    },
    onClose: fn(),
    onUpdate: fn(),
    onDelete: fn(),
  },
};

export const ErrorStory: Story = {
  args: {
    isOpen: true,
    story: {
      ...fullStory,
      id: 'story-det-004',
      status: 'error',
      priority: 'critical',
      title: 'Failed deployment: merge conflict in auth module',
      progress: 60,
    },
    onClose: fn(),
    onUpdate: fn(),
    onDelete: fn(),
  },
};
