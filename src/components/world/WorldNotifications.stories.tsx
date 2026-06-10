import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorldNotifications } from './WorldNotifications';

const meta: Meta<typeof WorldNotifications> = {
  title: 'World/WorldNotifications',
  component: WorldNotifications,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Ambient notification system that shows auto-cycling demo notifications in the world view. Notifications slide in from the right, display agent activity messages with domain colors, and auto-dismiss after 6 seconds.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    maxVisible: {
      control: { type: 'number', min: 1, max: 8 },
      description: 'Maximum number of notifications visible at once',
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: 400,
          background: '#0d0d1a',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxVisible: 4,
  },
};

export const SingleNotification: Story = {
  args: {
    maxVisible: 1,
  },
};

export const ManyNotifications: Story = {
  args: {
    maxVisible: 8,
  },
};
