import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StoryCreateModal } from './StoryCreateModal';
import { useStoryStore } from '../../stores/storyStore';
import { useEffect } from 'react';

function StoryCreateModalWrapper(props: { isOpen: boolean; defaultStatus?: string }) {
  const setStories = useStoryStore((s) => s.setStories);

  useEffect(() => {
    setStories([]);
  }, [setStories]);

  return (
    <StoryCreateModal
      isOpen={props.isOpen}
      onClose={fn()}
      defaultStatus={props.defaultStatus as 'backlog' | undefined}
    />
  );
}

const meta: Meta<typeof StoryCreateModal> = {
  title: 'Stories/StoryCreateModal',
  component: StoryCreateModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal for creating a new story in the stories list view. Uses the Zustand store directly to add stories. Includes fields for title, description, status, priority, complexity, category, epic ID, acceptance criteria, and technical notes.',
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
    onClose: {
      description: 'Callback when the modal is closed',
    },
    defaultStatus: {
      control: 'select',
      options: ['backlog', 'in_progress', 'ai_review', 'human_review', 'pr_created', 'done', 'error'],
      description: 'Pre-selected status for the new story',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => <StoryCreateModalWrapper isOpen={true} />,
};

export const WithDefaultInProgress: Story = {
  render: () => <StoryCreateModalWrapper isOpen={true} defaultStatus="in_progress" />,
};

export const Closed: Story = {
  render: () => <StoryCreateModalWrapper isOpen={false} />,
};
