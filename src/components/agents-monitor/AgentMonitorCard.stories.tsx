import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentMonitorCard } from './AgentMonitorCard';
import type { AgentMonitorData } from './AgentMonitorCard';

const now = new Date().toISOString();
const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

const workingAgent: AgentMonitorData = {
  id: 'dex-dev',
  name: 'Dex',
  status: 'working',
  phase: 'coding',
  progress: 65,
  story: 'Story 2.4',
  lastActivity: now,
  model: 'sonnet',
  squad: 'full-stack-dev',
  totalExecutions: 1247,
  successRate: 97,
  avgResponseTime: 1200,
};

const waitingAgent: AgentMonitorData = {
  id: 'qa-agent',
  name: 'QA Agent',
  status: 'waiting',
  phase: 'reviewing',
  progress: 30,
  story: 'Story 2.3',
  lastActivity: fiveMinAgo,
  model: 'haiku',
  squad: 'aios-core-dev',
  totalExecutions: 534,
  successRate: 99,
  avgResponseTime: 800,
};

const idleAgent: AgentMonitorData = {
  id: 'aria-architect',
  name: 'Aria',
  status: 'idle',
  phase: '',
  progress: 0,
  story: '',
  lastActivity: tenMinAgo,
  model: 'opus',
  squad: 'aios-core-dev',
  totalExecutions: 289,
  successRate: 95,
  avgResponseTime: 3400,
};

const errorAgent: AgentMonitorData = {
  id: 'devops-agent',
  name: 'Gage',
  status: 'error',
  phase: 'deploying',
  progress: 80,
  story: 'Story 1.7',
  lastActivity: now,
  model: 'sonnet',
  squad: 'operations-hub',
  totalExecutions: 156,
  successRate: 72,
  avgResponseTime: 5200,
};

const staleAgent: AgentMonitorData = {
  id: 'morgan-pm',
  name: 'Morgan',
  status: 'working',
  phase: 'planning',
  progress: 45,
  story: 'Epic 3',
  lastActivity: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  model: 'sonnet',
  squad: 'project-management-clickup',
  totalExecutions: 892,
  successRate: 98,
  avgResponseTime: 1800,
};

const meta: Meta<typeof AgentMonitorCard> = {
  title: 'AgentsMonitor/AgentMonitorCard',
  component: AgentMonitorCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Monitoring card for a single agent showing real-time status, phase, progress bar, performance stats (executions, success rate, response time), active story, and last activity timestamp. Includes stale indicator for inactive agents.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onClick: {
      action: 'clicked',
      description: 'Callback when the card is clicked',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Working: Story = {
  args: {
    agent: workingAgent,
    onClick: fn(),
  },
};

export const Waiting: Story = {
  args: {
    agent: waitingAgent,
    onClick: fn(),
  },
};

export const Idle: Story = {
  args: {
    agent: idleAgent,
    onClick: fn(),
  },
};

export const Error: Story = {
  args: {
    agent: errorAgent,
    onClick: fn(),
  },
};

export const Stale: Story = {
  args: {
    agent: staleAgent,
    onClick: fn(),
  },
};
