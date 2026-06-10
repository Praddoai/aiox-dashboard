import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SuccessFeedback } from './SuccessFeedback';

const meta: Meta<typeof SuccessFeedback> = {
  title: 'UI/SuccessFeedback',
  component: SuccessFeedback,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Animated success feedback overlay with checkmark, confetti, and minimal variants. Designed as a full-screen overlay.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    show: {
      control: 'boolean',
      description: 'Whether the feedback overlay is visible',
    },
    message: {
      control: 'text',
      description: 'Success message displayed below the animation',
    },
    variant: {
      control: 'select',
      options: ['checkmark', 'confetti', 'minimal'],
      description: 'Animation variant',
    },
    onComplete: {
      description: 'Callback fired when the exit animation completes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Checkmark: Story = {
  args: {
    show: true,
    variant: 'checkmark',
    message: 'Sucesso!',
    onComplete: fn(),
  },
};

export const Confetti: Story = {
  args: {
    show: true,
    variant: 'confetti',
    message: 'Sucesso!',
    onComplete: fn(),
  },
};

export const Minimal: Story = {
  args: {
    show: true,
    variant: 'minimal',
    message: 'Sucesso!',
    onComplete: fn(),
  },
};

export const CustomMessage: Story = {
  args: {
    show: true,
    variant: 'checkmark',
    message: 'Squad created successfully!',
    onComplete: fn(),
  },
};
