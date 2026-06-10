import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryManager } from './MemoryManager';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ maxWidth: 900, padding: 24, background: '#0f0f14' }}>
        <MemoryManager />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof MemoryManager> = {
  title: 'Settings/MemoryManager',
  component: MemoryManager,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'File browser and knowledge management UI with two tabs: Global Knowledge (file browser with content viewer) and Agent Knowledge (per-agent knowledge folders grouped by squad). Provides stats, breadcrumbs, and file preview.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Wrapper />,
};

export const InNarrowContainer: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <div style={{ maxWidth: 600, padding: 16, background: '#0f0f14' }}>
        <MemoryManager />
      </div>
    </QueryClientProvider>
  ),
};
