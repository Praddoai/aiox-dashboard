import type { Meta, StoryObj } from '@storybook/react-vite';
import InsightsView from './InsightsView';

const meta = {
  title: 'Views/InsightsView',
  component: InsightsView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Analytics and insights view showing key performance metrics (velocity, cycle time, error rate, completed stories), agent performance cards with progress bars, weekly activity bar chart, and bottleneck indicators. Uses inline mock data.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ height: '100vh', background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta satisfies Meta<typeof InsightsView>;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const InNarrowViewport: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', maxWidth: 480, background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};

export const InWideViewport: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', maxWidth: 1400, background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};
