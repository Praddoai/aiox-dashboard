import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardWorkspace from './DashboardWorkspace';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta: Meta<typeof DashboardWorkspace> = {
  title: 'Dashboard/DashboardWorkspace',
  component: DashboardWorkspace,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Top-level dashboard workspace with view-mode toggle between Default, Cockpit, and Insights dashboards.',
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
