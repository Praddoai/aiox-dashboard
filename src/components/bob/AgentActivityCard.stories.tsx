import type { Meta, StoryObj } from '@storybook/react-vite';
import AgentActivityCard from './AgentActivityCard';
import type { BobAgent } from '../../stores/bobStore';

const workingAgent: BobAgent = {
  id: 'agent-dex',
  name: '@dex (Dex)',
  task: 'Implementing authentication flow',
  status: 'working',
};

const completedAgent: BobAgent = {
  id: 'agent-morgan',
  name: '@morgan (Morgan)',
  task: 'Story creation finished',
  status: 'completed',
};

const waitingAgent: BobAgent = {
  id: 'agent-river',
  name: '@river (River)',
  task: 'Waiting for story validation',
  status: 'waiting',
};

const failedAgent: BobAgent = {
  id: 'agent-qa',
  name: '@qa (Quinn)',
  task: 'Test suite failed with 3 errors',
  status: 'failed',
};

const meta: Meta<typeof AgentActivityCard> = {
  title: 'Bob/AgentActivityCard',
  component: AgentActivityCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Card displaying a single agent status in the Bob orchestration pipeline. Shows colored left border, status dot, agent name, and current task.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isCurrent: {
      control: 'boolean',
      description: 'Whether this is the currently active agent (adds ring + pulse)',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Working: Story = {
  args: { agent: workingAgent, isCurrent: true },
};

export const Completed: Story = {
  args: { agent: completedAgent, isCurrent: false },
};

export const Waiting: Story = {
  args: { agent: waitingAgent, isCurrent: false },
};

export const Failed: Story = {
  args: { agent: failedAgent, isCurrent: false },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-3 w-96">
      <AgentActivityCard agent={workingAgent} isCurrent />
      <AgentActivityCard agent={completedAgent} />
      <AgentActivityCard agent={waitingAgent} />
      <AgentActivityCard agent={failedAgent} />
    </div>
  ),
};
