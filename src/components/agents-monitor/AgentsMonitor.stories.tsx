import type { Meta, StoryObj } from '@storybook/react-vite';
import AgentsMonitor from './AgentsMonitor';

const meta: Meta<typeof AgentsMonitor> = {
  title: 'AgentsMonitor/AgentsMonitor',
  component: AgentsMonitor,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Main agents monitoring dashboard combining performance stats, active/standby agent cards, and an activity timeline. Features live polling toggle and refresh. Relies on useAgents, useAgentPerformance, and useAgentActivity hooks for real-time data.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
