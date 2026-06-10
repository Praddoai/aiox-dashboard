import type { Meta, StoryObj } from '@storybook/react-vite';
import { SquadStatsPanel } from './SquadStatsPanel';
import type { SquadStats } from '../../types';

const healthyStats: SquadStats = {
  squadId: 'full-stack-dev',
  stats: {
    totalAgents: 10,
    byTier: { '0': 1, '1': 2, '2': 7 },
    quality: {
      withVoiceDna: 8,
      withAntiPatterns: 7,
      withIntegration: 9,
    },
    commands: {
      total: 42,
      byAgent: [
        { agentId: 'dex', count: 12 },
        { agentId: 'quinn', count: 8 },
        { agentId: 'gage', count: 6 },
        { agentId: 'aria', count: 5 },
      ],
    },
    qualityScore: 85,
  },
};

const lowQualityStats: SquadStats = {
  squadId: 'new-squad',
  stats: {
    totalAgents: 4,
    byTier: { '0': 0, '1': 1, '2': 3 },
    quality: {
      withVoiceDna: 1,
      withAntiPatterns: 0,
      withIntegration: 2,
    },
    commands: {
      total: 8,
      byAgent: [
        { agentId: 'agent-a', count: 5 },
        { agentId: 'agent-b', count: 3 },
      ],
    },
    qualityScore: 35,
  },
};

const meta: Meta<typeof SquadStatsPanel> = {
  title: 'Squads/SquadStatsPanel',
  component: SquadStatsPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Statistics panel displaying squad metrics in a responsive grid. Shows total agents, tier distribution, quality score, voice DNA coverage, anti-pattern coverage, and command counts with animated progress bars.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    stats: {
      control: false,
      description: 'Squad statistics data object (null shows skeleton loading state)',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360, height: 600, position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const HighQuality: Story = {
  args: {
    stats: healthyStats,
  },
};

export const LowQuality: Story = {
  args: {
    stats: lowQualityStats,
  },
};

export const Loading: Story = {
  args: {
    stats: null,
  },
};
