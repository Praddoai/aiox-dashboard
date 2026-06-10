import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { KeyboardShortcuts } from './KeyboardShortcuts';

const meta: Meta<typeof KeyboardShortcuts> = {
  title: 'UI/KeyboardShortcuts',
  component: KeyboardShortcuts,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal overlay that displays all available keyboard shortcuts grouped by category. Opened with Cmd+? and closed with Escape.',
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
      description: 'Whether the modal is visible',
    },
    onClose: {
      description: 'Callback when the modal is dismissed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: fn(),
  },
};
