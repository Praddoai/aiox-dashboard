import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoomView } from './RoomView';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper(props: React.ComponentProps<typeof RoomView>) {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: '100vw', height: '100vh', background: '#0d0d1a' }}>
        <RoomView {...props} />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof RoomView> = {
  title: 'World/RoomView',
  component: RoomView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full room interior view with floor grid, walls, furniture, animated agent sprites, speech bubbles, interaction lines, emote ring, ambient particles, day/night cycle overlay, and keyboard navigation. Supports zoom and camera panning.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    roomId: { control: 'text', description: 'Squad/room ID to display' },
    zoom: { control: { type: 'number', min: 0.5, max: 2.5, step: 0.1 }, description: 'Current zoom level' },
  },
  render: (args) => <Wrapper {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DevRoom: Story = {
  args: {
    roomId: 'full-stack-dev',
    onBack: fn(),
    zoom: 1,
    onZoomChange: fn(),
  },
};

export const ContentRoom: Story = {
  args: {
    roomId: 'copywriting',
    onBack: fn(),
    zoom: 1,
    onZoomChange: fn(),
  },
};

export const OpsRoom: Story = {
  args: {
    roomId: 'orquestrador-global',
    onBack: fn(),
    zoom: 1,
    onZoomChange: fn(),
  },
};

export const ZoomedIn: Story = {
  args: {
    roomId: 'full-stack-dev',
    onBack: fn(),
    zoom: 1.8,
    onZoomChange: fn(),
  },
};
