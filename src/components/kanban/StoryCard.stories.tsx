import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DndContext } from '@dnd-kit/core';
import { StoryCard } from './StoryCard';
import type { Story as StoryType } from '../../stores/storyStore';

const baseStory: StoryType = {
  id: 'story-sc-001',
  title: 'Implement dark mode toggle in settings panel',
  description: 'Add a theme switcher that supports dark, light, and system modes.',
  status: 'in_progress',
  priority: 'medium',
  complexity: 'standard',
  category: 'feature',
  assignedAgent: 'aios-dev',
  progress: 45,
  createdAt: '2026-02-20T10:00:00Z',
  updatedAt: '2026-02-25T14:00:00Z',
};

function CardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DndContext>
      <div style={{ width: 280 }}>{children}</div>
    </DndContext>
  );
}

const meta: Meta<typeof StoryCard> = {
  title: 'Kanban/StoryCard',
  component: StoryCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A draggable story card used inside kanban columns. Displays category, complexity, priority, title, progress, and assigned agent with sortable drag handle.',
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
    isDragOverlay: {
      control: 'boolean',
      description: 'Whether the card is being used as a drag overlay',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <CardWrapper>
      <StoryCard story={baseStory} onClick={fn()} />
    </CardWrapper>
  ),
};

export const CriticalPriority: Story = {
  render: () => (
    <CardWrapper>
      <StoryCard
        story={{ ...baseStory, id: 'story-sc-crit', priority: 'critical', title: 'Critical production bug in auth service' }}
        onClick={fn()}
      />
    </CardWrapper>
  ),
};

export const BobOrchestrated: Story = {
  render: () => (
    <CardWrapper>
      <StoryCard
        story={{ ...baseStory, id: 'story-sc-bob', bobOrchestrated: true, title: 'Bob-orchestrated refactoring task' }}
        onClick={fn()}
      />
    </CardWrapper>
  ),
};

export const Unassigned: Story = {
  render: () => (
    <CardWrapper>
      <StoryCard
        story={{
          ...baseStory,
          id: 'story-sc-un',
          assignedAgent: undefined,
          progress: 0,
          title: 'Unassigned story in backlog',
          category: 'docs',
          complexity: 'simple',
        }}
        onClick={fn()}
      />
    </CardWrapper>
  ),
};

export const Completed: Story = {
  render: () => (
    <CardWrapper>
      <StoryCard
        story={{
          ...baseStory,
          id: 'story-sc-done',
          progress: 100,
          status: 'done',
          title: 'Completed story with full progress',
          category: 'refactor',
          complexity: 'complex',
          priority: 'high',
        }}
        onClick={fn()}
      />
    </CardWrapper>
  ),
};
