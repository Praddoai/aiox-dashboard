import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentActivityTimeline } from './AgentActivityTimeline';
import type { AgentActivityEntry } from '../../types';

const now = Date.now();

const mockEntries: AgentActivityEntry[] = [
  {
    id: '1',
    agentId: 'dex-dev',
    timestamp: new Date(now - 10_000).toISOString(),
    action: 'Implemented AgentCard component refactoring',
    status: 'success',
    duration: 4200,
  },
  {
    id: '2',
    agentId: 'qa-agent',
    timestamp: new Date(now - 30_000).toISOString(),
    action: 'Ran test suite for agents module',
    status: 'success',
    duration: 12300,
  },
  {
    id: '3',
    agentId: 'dex-dev',
    timestamp: new Date(now - 60_000).toISOString(),
    action: 'Fixed TypeScript errors in AgentProfile',
    status: 'success',
    duration: 1800,
  },
  {
    id: '4',
    agentId: 'devops-agent',
    timestamp: new Date(now - 120_000).toISOString(),
    action: 'Deployed build #247 to staging',
    status: 'success',
    duration: 45000,
  },
  {
    id: '5',
    agentId: 'architect-agent',
    timestamp: new Date(now - 180_000).toISOString(),
    action: 'Failed to generate dependency graph',
    status: 'error',
    duration: 8500,
  },
  {
    id: '6',
    agentId: 'dex-dev',
    timestamp: new Date(now - 300_000).toISOString(),
    action: 'Created Storybook stories for UI components',
    status: 'success',
    duration: 6700,
  },
  {
    id: '7',
    agentId: 'pm-agent',
    timestamp: new Date(now - 420_000).toISOString(),
    action: 'Updated epic execution plan',
    status: 'success',
    duration: 3200,
  },
  {
    id: '8',
    agentId: 'qa-agent',
    timestamp: new Date(now - 600_000).toISOString(),
    action: 'QA gate check failed for Story 2.3',
    status: 'error',
    duration: 15600,
  },
];

const meta: Meta<typeof AgentActivityTimeline> = {
  title: 'AgentsMonitor/AgentActivityTimeline',
  component: AgentActivityTimeline,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Scrollable timeline showing recent agent activity entries with status icons (success/error), agent badges, action descriptions, duration, and timestamps.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    agentFilter: {
      control: 'select',
      options: [undefined, 'dex-dev', 'qa-agent', 'devops-agent', 'architect-agent'],
      description: 'Filter entries to a specific agent ID',
    },
    maxEntries: {
      control: { type: 'number', min: 1, max: 50 },
      description: 'Maximum number of entries to display',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[520px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entries: mockEntries,
  },
};

export const FilteredByAgent: Story = {
  args: {
    entries: mockEntries,
    agentFilter: 'dex-dev',
  },
};

export const LimitedEntries: Story = {
  args: {
    entries: mockEntries,
    maxEntries: 3,
  },
};

export const Empty: Story = {
  args: {
    entries: [],
  },
};

export const WithErrors: Story = {
  args: {
    entries: mockEntries.filter((e) => e.status === 'error'),
  },
};
