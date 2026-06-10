import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import {
  EmptyState,
  NoSearchResults,
  NoMessages,
  NoActivity,
  NoAgents,
  OfflineState,
  ErrorState,
} from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Empty state component for displaying when there is no content.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['default', 'search', 'message', 'activity', 'agent', 'offline', 'error', 'custom'],
      description: 'Preset type with default icon',
    },
    compact: {
      control: 'boolean',
      description: 'Smaller version for inline use',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No items found',
    description: 'There are no items to display at this time.',
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export const WithAction: Story = {
  args: {
    title: 'No projects',
    description: 'Get started by creating your first project.',
    action: {
      label: 'Create Project',
      onClick: fn(),
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export const WithSecondaryAction: Story = {
  args: {
    title: 'No results',
    description: 'Try adjusting your search or filters.',
    action: {
      label: 'Clear Filters',
      onClick: fn(),
    },
    secondaryAction: {
      label: 'Learn More',
      onClick: fn(),
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export const Compact: Story = {
  args: {
    title: 'No data',
    description: 'No data available.',
    compact: true,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const CustomIcon: Story = {
  args: {
    type: 'custom',
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-blue-500"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'No layers',
    description: 'Start by adding your first layer to the canvas.',
    action: {
      label: 'Add Layer',
      onClick: fn(),
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

// Preset Components
export const SearchResults: Story = {
  render: () => (
    <div className="w-96">
      <NoSearchResults
        query="test query"
        onClear={fn()}
      />
    </div>
  ),
};

export const Messages: Story = {
  render: () => (
    <div className="w-96">
      <NoMessages onStartChat={fn()} />
    </div>
  ),
};

export const Activity: Story = {
  render: () => (
    <div className="w-96">
      <NoActivity />
    </div>
  ),
};

export const Agents: Story = {
  render: () => (
    <div className="w-96">
      <NoAgents onExplore={fn()} />
    </div>
  ),
};

export const Offline: Story = {
  render: () => (
    <div className="w-96">
      <OfflineState onRetry={fn()} />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div className="w-96">
      <ErrorState onRetry={fn()} />
    </div>
  ),
};

export const ErrorWithMessage: Story = {
  render: () => (
    <div className="w-96">
      <ErrorState
        message="Failed to load data from the server."
        onRetry={fn()}
      />
    </div>
  ),
};

export const AllPresets: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 w-[800px]">
      <div className="glass p-4 rounded-xl">
        <NoSearchResults query="agents" onClear={fn()} />
      </div>
      <div className="glass p-4 rounded-xl">
        <NoMessages onStartChat={fn()} />
      </div>
      <div className="glass p-4 rounded-xl">
        <NoActivity />
      </div>
      <div className="glass p-4 rounded-xl">
        <NoAgents onExplore={fn()} />
      </div>
      <div className="glass p-4 rounded-xl">
        <OfflineState onRetry={fn()} />
      </div>
      <div className="glass p-4 rounded-xl">
        <ErrorState onRetry={fn()} />
      </div>
    </div>
  ),
};
