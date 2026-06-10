import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusDot } from './StatusDot';

const meta: Meta<typeof StatusDot> = {
  title: 'UI/StatusDot',
  component: StatusDot,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A status indicator dot with optional glow, pulse animation, and label.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'working', 'waiting', 'error', 'success', 'offline'],
      description: 'Current status',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Dot size',
    },
    glow: {
      control: 'boolean',
      description: 'Enables glow effect',
    },
    pulse: {
      control: 'boolean',
      description: 'Enables pulse animation (working/waiting only)',
    },
    label: {
      control: 'text',
      description: 'Optional text label next to the dot',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    status: 'idle',
    size: 'md',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <StatusDot status="idle" label="Idle" />
      <StatusDot status="working" label="Working" />
      <StatusDot status="waiting" label="Waiting" />
      <StatusDot status="error" label="Error" />
      <StatusDot status="success" label="Success" />
      <StatusDot status="offline" label="Offline" />
    </div>
  ),
};

export const WithGlow: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <StatusDot status="working" glow label="Working" />
      <StatusDot status="waiting" glow label="Waiting" />
      <StatusDot status="error" glow label="Error" />
      <StatusDot status="success" glow label="Success" />
    </div>
  ),
};

export const WithPulse: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <StatusDot status="working" pulse label="Working" />
      <StatusDot status="waiting" pulse label="Waiting" />
    </div>
  ),
};

export const WithLabel: Story = {
  args: {
    status: 'success',
    label: 'Connected',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <StatusDot status="success" size="sm" label="Small" />
      <StatusDot status="success" size="md" label="Medium" />
      <StatusDot status="success" size="lg" label="Large" />
    </div>
  ),
};
