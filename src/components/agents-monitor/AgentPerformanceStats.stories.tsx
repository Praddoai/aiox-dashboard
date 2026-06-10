import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentPerformanceStats } from './AgentPerformanceStats';
import type { AgentMonitorData } from './AgentMonitorCard';

const now = new Date().toISOString();

const mockAgents: AgentMonitorData[] = [
  {
    id: 'dex-dev',
    name: 'Dex',
    status: 'working',
    phase: 'coding',
    progress: 65,
    story: 'Story 2.4',
    lastActivity: now,
    model: 'sonnet',
    totalExecutions: 1247,
    successRate: 97,
    avgResponseTime: 1200,
  },
  {
    id: 'qa-agent',
    name: 'QA Agent',
    status: 'waiting',
    phase: 'reviewing',
    progress: 30,
    story: 'Story 2.3',
    lastActivity: now,
    model: 'haiku',
    totalExecutions: 534,
    successRate: 99,
    avgResponseTime: 800,
  },
  {
    id: 'aria-architect',
    name: 'Aria',
    status: 'idle',
    phase: '',
    progress: 0,
    story: '',
    lastActivity: now,
    model: 'opus',
    totalExecutions: 289,
    successRate: 95,
    avgResponseTime: 3400,
  },
  {
    id: 'devops-agent',
    name: 'Gage',
    status: 'error',
    phase: 'deploying',
    progress: 80,
    story: 'Story 1.7',
    lastActivity: now,
    model: 'sonnet',
    totalExecutions: 156,
    successRate: 72,
    avgResponseTime: 5200,
  },
];

const highPerformanceAgents: AgentMonitorData[] = [
  {
    id: 'agent-1',
    name: 'Agent Alpha',
    status: 'working',
    phase: 'coding',
    progress: 90,
    story: 'Story 5.1',
    lastActivity: now,
    model: 'opus',
    totalExecutions: 5200,
    successRate: 99,
    avgResponseTime: 900,
  },
  {
    id: 'agent-2',
    name: 'Agent Beta',
    status: 'working',
    phase: 'testing',
    progress: 50,
    story: 'Story 5.2',
    lastActivity: now,
    model: 'sonnet',
    totalExecutions: 3800,
    successRate: 98,
    avgResponseTime: 1100,
  },
];

const meta: Meta<typeof AgentPerformanceStats> = {
  title: 'AgentsMonitor/AgentPerformanceStats',
  component: AgentPerformanceStats,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Dashboard-level performance statistics showing total executions, average success rate (with progress bar), average response time, and active agent count. Aggregates data from an array of AgentMonitorData.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    agents: mockAgents,
  },
};

export const HighPerformance: Story = {
  args: {
    agents: highPerformanceAgents,
  },
};

export const SingleAgent: Story = {
  args: {
    agents: [mockAgents[0]],
  },
};

export const Empty: Story = {
  args: {
    agents: [],
  },
};
