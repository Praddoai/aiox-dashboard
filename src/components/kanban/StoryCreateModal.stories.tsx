import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StoryCreateModal } from './StoryCreateModal';

const meta: Meta<typeof StoryCreateModal> = {
  title: 'Kanban/StoryCreateModal',
  component: StoryCreateModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal dialog for creating a new story. Includes fields for title, description, status, priority, complexity, category, assigned agent, acceptance criteria, and technical notes.',
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
    onSubmit: {
      description: 'Callback with the created story data',
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
  args: {
    isOpen: true,
    onClose: fn(),
    onSubmit: fn(),
    defaultStatus: 'backlog',
  },
};

export const DefaultInProgress: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    onSubmit: fn(),
    defaultStatus: 'in_progress',
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: fn(),
    onSubmit: fn(),
  },
};
