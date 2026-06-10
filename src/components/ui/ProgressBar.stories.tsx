import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An animated progress bar with multiple variants, sizes, and glow effects.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progress value from 0 to 100',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Bar height',
    },
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'error', 'info'],
      description: 'Color variant',
    },
    glow: {
      control: 'boolean',
      description: 'Enables glow effect',
    },
    showLabel: {
      control: 'boolean',
      description: 'Shows percentage label',
    },
    label: {
      control: 'text',
      description: 'Custom text label',
    },
    animate: {
      control: 'boolean',
      description: 'Enables entrance animation',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 50,
    size: 'md',
    variant: 'default',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <ProgressBar value={60} variant="default" label="Default" showLabel />
      <ProgressBar value={80} variant="success" label="Success" showLabel />
      <ProgressBar value={45} variant="warning" label="Warning" showLabel />
      <ProgressBar value={30} variant="error" label="Error" showLabel />
      <ProgressBar value={70} variant="info" label="Info" showLabel />
    </div>
  ),
};

export const WithLabel: Story = {
  args: {
    value: 65,
    label: 'Upload Progress',
    showLabel: true,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithGlow: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <ProgressBar value={75} variant="default" glow />
      <ProgressBar value={90} variant="success" glow />
      <ProgressBar value={50} variant="info" glow />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <ProgressBar value={60} size="sm" label="Small" showLabel />
      <ProgressBar value={60} size="md" label="Medium" showLabel />
      <ProgressBar value={60} size="lg" label="Large" showLabel />
    </div>
  ),
};

export const Empty: Story = {
  args: {
    value: 0,
    showLabel: true,
    label: 'Not started',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Full: Story = {
  args: {
    value: 100,
    variant: 'success',
    showLabel: true,
    label: 'Complete',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};
