import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GatherWorld } from './GatherWorld';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: '100vw', height: '100vh', background: '#0d0d1a' }}>
        <GatherWorld />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof GatherWorld> = {
  title: 'World/GatherWorld',
  component: GatherWorld,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The main gather-style virtual world view. Orchestrates the world map, room views, minimap, workflow panel, and notifications. Supports door transition animations, zoom controls, and room navigation.',
      },
    },
  },
  tags: ['autodocs'],
  render: () => <Wrapper />,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
