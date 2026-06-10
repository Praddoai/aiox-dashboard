import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Badge component for labels, status, and counts.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'squad', 'status', 'count'],
      description: 'Badge variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Badge size',
    },
    squadType: {
      control: 'select',
      options: ['default', 'copywriting', 'design', 'creator', 'orchestrator'],
      description: 'Squad color (when variant="squad")',
    },
    status: {
      control: 'select',
      options: ['online', 'busy', 'offline', 'success', 'error', 'warning'],
      description: 'Status type (when variant="status")',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
    </div>
  ),
};

export const SquadBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="squad" squadType="copywriting">Copywriting</Badge>
      <Badge variant="squad" squadType="design">Design</Badge>
      <Badge variant="squad" squadType="creator">Creator</Badge>
      <Badge variant="squad" squadType="orchestrator">Orchestrator</Badge>
      <Badge variant="squad" squadType="default">Default</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="status" status="online">Online</Badge>
      <Badge variant="status" status="busy">Busy</Badge>
      <Badge variant="status" status="offline">Offline</Badge>
      <Badge variant="status" status="success">Success</Badge>
      <Badge variant="status" status="error">Error</Badge>
      <Badge variant="status" status="warning">Warning</Badge>
    </div>
  ),
};

export const CountBadge: Story = {
  args: {
    variant: 'count',
    children: '5',
  },
};

export const CountBadges: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Badge variant="count">3</Badge>
      <Badge variant="count">12</Badge>
      <Badge variant="count">99+</Badge>
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-medium">Notifications</span>
        <Badge variant="count">5</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">Agent Status:</span>
        <Badge variant="status" status="online">Active</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">Squad:</span>
        <Badge variant="squad" squadType="design">Design Team</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">Build Status:</span>
        <Badge variant="status" status="success">Passed</Badge>
      </div>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="status" status="online">
        <span className="mr-1">●</span> Online
      </Badge>
      <Badge variant="status" status="error">
        <span className="mr-1">{'\u2715'}</span> Failed
      </Badge>
      <Badge variant="status" status="success">
        <span className="mr-1">{'\u2713'}</span> Complete
      </Badge>
    </div>
  ),
};
