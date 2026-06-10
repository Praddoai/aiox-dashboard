import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CockpitDashboard from './CockpitDashboard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
  title: 'Dashboard/CockpitDashboard',
  component: CockpitDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'AIOX Cockpit-themed dashboard showing KPIs, service health, token usage, and system metrics in a brutalist dark theme with lime neon accents.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <QueryClientProvider client={queryClient}>
        <div style={{ height: '100vh', background: '#050505' }} data-theme="aiox">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta satisfies Meta<typeof CockpitDashboard>;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
