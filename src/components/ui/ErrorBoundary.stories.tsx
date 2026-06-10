import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CompactErrorFallback } from './ErrorBoundary';

/**
 * Stories for the CompactErrorFallback component.
 *
 * Note: The ErrorBoundary class component and the useErrorHandler hook are also
 * exported from this module but are not demonstrated here because class components
 * and hooks cannot be easily rendered as standalone stories.
 */
const meta: Meta<typeof CompactErrorFallback> = {
  title: 'UI/ErrorBoundary',
  component: CompactErrorFallback,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Compact error fallback for smaller sections. Shows an error icon, a message, and an optional retry button. Use inside ErrorBoundary as a custom fallback.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      control: 'text',
      description: 'Error message displayed to the user',
    },
    onRetry: {
      description: 'Callback fired when the retry button is clicked. If not provided, the retry button is hidden.',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Erro ao carregar',
  },
};

export const CustomMessage: Story = {
  args: {
    message: 'Failed to load agent data. Please check your connection.',
  },
};

export const WithRetry: Story = {
  args: {
    message: 'Something went wrong',
    onRetry: fn(),
  },
};
