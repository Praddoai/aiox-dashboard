import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentList } from './AgentList';

const meta: Meta<typeof AgentList> = {
  title: 'Agents/AgentList',
  component: AgentList,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'List of agents grouped by tier (Orchestrators, Masters, Specialists) with collapsible sections. Fetches data from useAgents hook and uses the UI store for squad/agent selection.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onAgentSelect: {
      action: 'agent-selected',
      description: 'Callback when an agent is selected from the list',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onAgentSelect: fn(),
  },
};
