import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MonitorWorkspace from './MonitorWorkspace';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta: Meta<typeof MonitorWorkspace> = {
  title: 'Monitor/MonitorWorkspace',
  component: MonitorWorkspace,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Top-level monitor workspace with view-mode toggle between Live Monitor and Activity History.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div style={{ height: '100vh', background: '#0a0a0f' }}>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
