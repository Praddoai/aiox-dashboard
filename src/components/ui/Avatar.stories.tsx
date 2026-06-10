import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Avatar component with initials fallback and status indicator.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Avatar size',
    },
    status: {
      control: 'select',
      options: [undefined, 'online', 'busy', 'offline'],
      description: 'Status indicator',
    },
    squadType: {
      control: 'select',
      options: ['default', 'copywriting', 'design', 'creator', 'orchestrator'],
      description: 'Squad color theme',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'John Doe',
    size: 'md',
  },
};

export const WithImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    name: 'John Doe',
    size: 'md',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar name="John Doe" size="sm" />
      <Avatar name="John Doe" size="md" />
      <Avatar name="John Doe" size="lg" />
      <Avatar name="John Doe" size="xl" />
    </div>
  ),
};

export const OnlineStatus: Story = {
  args: {
    name: 'John Doe',
    status: 'online',
    size: 'lg',
  },
};

export const BusyStatus: Story = {
  args: {
    name: 'Jane Smith',
    status: 'busy',
    size: 'lg',
  },
};

export const OfflineStatus: Story = {
  args: {
    name: 'Bob Wilson',
    status: 'offline',
    size: 'lg',
  },
};

export const StatusSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar name="A" size="sm" status="online" />
      <Avatar name="B" size="md" status="busy" />
      <Avatar name="C" size="lg" status="offline" />
      <Avatar name="D" size="xl" status="online" />
    </div>
  ),
};

export const SquadColors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <Avatar name="Copy Writer" squadType="copywriting" size="lg" />
        <p className="text-xs mt-2 text-secondary">Copywriting</p>
      </div>
      <div className="text-center">
        <Avatar name="Designer" squadType="design" size="lg" />
        <p className="text-xs mt-2 text-secondary">Design</p>
      </div>
      <div className="text-center">
        <Avatar name="Creator" squadType="creator" size="lg" />
        <p className="text-xs mt-2 text-secondary">Creator</p>
      </div>
      <div className="text-center">
        <Avatar name="Orchestrator" squadType="orchestrator" size="lg" />
        <p className="text-xs mt-2 text-secondary">Orchestrator</p>
      </div>
    </div>
  ),
};

export const SingleInitial: Story = {
  args: {
    name: 'Alice',
    size: 'lg',
  },
};

export const NoName: Story = {
  args: {
    size: 'lg',
  },
};

export const LongName: Story = {
  args: {
    name: 'Alexander Benjamin Christopher',
    size: 'lg',
  },
};

export const AvatarGroup: Story = {
  render: () => (
    <div className="flex -space-x-3">
      <Avatar name="John Doe" size="md" className="ring-2 ring-white dark:ring-gray-900" />
      <Avatar name="Jane Smith" squadType="design" size="md" className="ring-2 ring-white dark:ring-gray-900" />
      <Avatar name="Bob Wilson" squadType="creator" size="md" className="ring-2 ring-white dark:ring-gray-900" />
      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-gray-900">
        +5
      </div>
    </div>
  ),
};
