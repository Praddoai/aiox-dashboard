import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorldMap } from './WorldMap';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper(props: React.ComponentProps<typeof WorldMap>) {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: '100vw', height: '100vh', background: '#0d0d1a' }}>
        <WorldMap {...props} />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof WorldMap> = {
  title: 'World/WorldMap',
  component: WorldMap,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The isometric world map overview showing all rooms grouped by domain. Features domain-zone backgrounds, workflow connection lines, room hover tooltips, drag-to-pan, scroll-to-zoom, and domain filter bar with agent counts.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    zoom: { control: { type: 'number', min: 0.4, max: 2.0, step: 0.1 }, description: 'Current zoom level' },
    highlightedRooms: { control: 'object', description: 'Array of room IDs to highlight' },
  },
  render: (args) => <Wrapper {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onRoomClick: fn(),
    zoom: 1,
    onZoomChange: fn(),
    highlightedRooms: [],
  },
};

export const ZoomedOut: Story = {
  args: {
    onRoomClick: fn(),
    zoom: 0.6,
    onZoomChange: fn(),
    highlightedRooms: [],
  },
};

export const ZoomedIn: Story = {
  args: {
    onRoomClick: fn(),
    zoom: 1.6,
    onZoomChange: fn(),
    highlightedRooms: [],
  },
};

export const HighlightedWorkflow: Story = {
  args: {
    onRoomClick: fn(),
    zoom: 1,
    onZoomChange: fn(),
    highlightedRooms: ['copywriting', 'creative-studio', 'media-buy', 'data-analytics'],
  },
};
