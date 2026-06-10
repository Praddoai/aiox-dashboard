import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusDot } from '../ui';

/**
 * ConnectionStatus wraps the monitorStore. This presentational
 * version directly renders the StatusDot with different states.
 */

function ConnectionStatusPresentation({ connected }: { connected: boolean }) {
  return (
    <StatusDot
      status={connected ? 'working' : 'offline'}
      size="md"
      glow={connected}
      pulse={connected}
      label={connected ? 'Connected' : 'Disconnected'}
    />
  );
}

const meta: Meta<typeof ConnectionStatusPresentation> = {
  title: 'Monitor/ConnectionStatus',
  component: ConnectionStatusPresentation,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Compact connection status indicator using StatusDot. Shows connected (green, pulsing) or disconnected (gray) state.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    connected: {
      control: 'boolean',
      description: 'Whether the monitor websocket is connected',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Connected: Story = {
  args: { connected: true },
};

export const Disconnected: Story = {
  args: { connected: false },
};
