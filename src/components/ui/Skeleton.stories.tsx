import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonAgentCard,
  SkeletonMessageList,
  SkeletonMetricCard,
  SkeletonDashboard,
} from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Skeleton loading placeholders with multiple variants, animations, and pre-built compositions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular', 'rounded'],
      description: 'Shape variant',
    },
    width: {
      control: 'text',
      description: 'Custom width (string or number)',
    },
    height: {
      control: 'text',
      description: 'Custom height (string or number)',
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
      description: 'Animation type',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'text',
    width: '200px',
    height: '16px',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton variant="text" width="120px" height="16px" />
        <span className="text-xs text-secondary">Text</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Skeleton variant="circular" width="48px" height="48px" />
        <span className="text-xs text-secondary">Circular</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Skeleton variant="rectangular" width="120px" height="48px" />
        <span className="text-xs text-secondary">Rectangular</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Skeleton variant="rounded" width="120px" height="48px" />
        <span className="text-xs text-secondary">Rounded</span>
      </div>
    </div>
  ),
};

export const Animations: Story = {
  render: () => (
    <div className="space-y-4 w-60">
      <div className="space-y-1">
        <span className="text-xs text-secondary">Pulse</span>
        <Skeleton variant="rounded" width="100%" height="32px" animation="pulse" />
      </div>
      <div className="space-y-1">
        <span className="text-xs text-secondary">Wave</span>
        <Skeleton variant="rounded" width="100%" height="32px" animation="wave" />
      </div>
      <div className="space-y-1">
        <span className="text-xs text-secondary">None</span>
        <Skeleton variant="rounded" width="100%" height="32px" animation="none" />
      </div>
    </div>
  ),
};

export const TextBlock: Story = {
  render: () => (
    <div className="w-64">
      <SkeletonText lines={4} />
    </div>
  ),
};

export const AvatarSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <SkeletonAvatar size="sm" />
        <span className="text-xs text-secondary">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <SkeletonAvatar size="md" />
        <span className="text-xs text-secondary">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <SkeletonAvatar size="lg" />
        <span className="text-xs text-secondary">Large</span>
      </div>
    </div>
  ),
};

export const Card: Story = {
  render: () => (
    <div className="w-72">
      <SkeletonCard />
    </div>
  ),
};

export const AgentCard: Story = {
  render: () => (
    <div className="w-72">
      <SkeletonAgentCard />
    </div>
  ),
};

export const Messages: Story = {
  render: () => (
    <div className="w-96">
      <SkeletonMessageList count={3} />
    </div>
  ),
};

export const MetricCard: Story = {
  render: () => (
    <div className="w-56">
      <SkeletonMetricCard />
    </div>
  ),
};

export const FullDashboard: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="w-[800px]">
      <SkeletonDashboard />
    </div>
  ),
};
