import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StoryCard } from './StoryCard';
import type { Story as StoryType } from '../../stores/storyStore';

const baseStory: StoryType = {
  id: 'story-sc-list-001',
  title: 'Build agent activity timeline component',
  description: 'Create a timeline view showing recent agent actions, executions, and status changes.',
  status: 'in_progress',
  priority: 'high',
  complexity: 'standard',
  category: 'feature',
  assignedAgent: 'aios-dev',
  progress: 55,
  createdAt: '2026-02-20T10:00:00Z',
  updatedAt: '2026-02-25T14:00:00Z',
};

const meta: Meta<typeof StoryCard> = {
  title: 'Stories/StoryCard',
  component: StoryCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Story card component used in the stories list view. Displays category, complexity, priority, title, description, assigned agent, and progress with status-based ring styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    story: {
      control: false,
      description: 'The story data object to render',
    },
    onClick: {
      description: 'Callback when the card is clicked',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    story: baseStory,
    onClick: fn(),
  },
};

export const CriticalBug: Story = {
  args: {
    story: {
      ...baseStory,
      id: 'story-sc-list-crit',
      title: 'Critical: Memory leak in WebSocket handler',
      category: 'fix',
      priority: 'critical',
      complexity: 'complex',
      status: 'error',
      progress: 30,
    },
    onClick: fn(),
  },
};

export const BobOrchestrated: Story = {
  args: {
    story: {
      ...baseStory,
      id: 'story-sc-list-bob',
      bobOrchestrated: true,
      title: 'Auto-generated: Refactor config loader',
      category: 'refactor',
      status: 'ai_review',
      progress: 90,
    },
    onClick: fn(),
  },
};

export const CompletedDocs: Story = {
  args: {
    story: {
      ...baseStory,
      id: 'story-sc-list-done',
      title: 'Update API reference documentation',
      category: 'docs',
      priority: 'low',
      complexity: 'simple',
      status: 'done',
      progress: 100,
      assignedAgent: undefined,
    },
    onClick: fn(),
  },
};

export const NoDescription: Story = {
  args: {
    story: {
      ...baseStory,
      id: 'story-sc-list-nodesc',
      description: undefined,
      title: 'Quick fix: typo in error messages',
      category: 'fix',
      priority: 'low',
      progress: 0,
      status: 'backlog',
    },
    onClick: fn(),
  },
};
