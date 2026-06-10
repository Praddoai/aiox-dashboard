import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch } from './GlobalSearch';
import { GlassButton } from '../ui';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

/**
 * Interactive wrapper that provides a toggle button to open/close the search overlay.
 */
function SearchStoryWrapper({ startOpen = false }: { startOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(startOpen);

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ height: '100vh', padding: 24, background: '#0f0f14' }}>
        <GlassButton variant="primary" onClick={() => setIsOpen(true)}>
          Open Search (Cmd+K)
        </GlassButton>
        <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          Click the button or press Cmd+K to open global search.
        </p>
        <GlobalSearch
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            fn()();
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof GlobalSearch> = {
  title: 'Search/GlobalSearch',
  component: GlobalSearch,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Global search overlay (Cmd+K) for finding agents across all squads. Features keyboard navigation (arrow keys, Enter, Escape), results grouped by squad with tier badges, and a search-as-you-type experience backed by the agents API.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean', description: 'Whether the search overlay is visible' },
    onClose: { action: 'closed', description: 'Callback when the overlay is dismissed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SearchStoryWrapper />,
};

export const InitiallyOpen: Story = {
  render: () => <SearchStoryWrapper startOpen />,
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div style={{ height: 200, padding: 24, background: '#0f0f14' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Search overlay is closed. Toggle isOpen in the controls panel.
          </p>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};
