import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConnectionsMap } from './ConnectionsMap';
import type { AgentSummary } from '../../types';

const mockAgents: AgentSummary[] = [
  { id: 'bob', name: 'Bob', tier: 0, squad: 'orchestrator', title: 'Global Orchestrator' },
  { id: 'aria', name: 'Aria', tier: 1, squad: 'full-stack-dev', title: 'System Architect' },
  { id: 'dex', name: 'Dex', tier: 2, squad: 'full-stack-dev', title: 'Senior Developer' },
  { id: 'quinn', name: 'Quinn', tier: 2, squad: 'full-stack-dev', title: 'QA Engineer' },
  { id: 'gage', name: 'Gage', tier: 2, squad: 'full-stack-dev', title: 'DevOps Engineer' },
  { id: 'river', name: 'River', tier: 1, squad: 'full-stack-dev', title: 'Scrum Master' },
];

const mockConnections = [
  { from: 'bob', to: 'aria', type: 'handoffTo' },
  { from: 'bob', to: 'river', type: 'handoffTo' },
  { from: 'aria', to: 'dex', type: 'handoffTo' },
  { from: 'dex', to: 'quinn', type: 'handoffTo' },
  { from: 'quinn', to: 'gage', type: 'handoffTo' },
  { from: 'river', to: 'dex', type: 'receivesFrom' },
  { from: 'river', to: 'bob', type: 'receivesFrom' },
];

const meta: Meta<typeof ConnectionsMap> = {
  title: 'Squads/ConnectionsMap',
  component: ConnectionsMap,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'SVG-based visual map of agent connections within a squad. Agents are positioned in concentric rings by tier (Orchestrator at center, Masters in middle, Specialists outer). Connections show handoff and receive relationships with directional arrows.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    agents: {
      control: false,
      description: 'Array of agent summaries to position on the map',
    },
    connections: {
      control: false,
      description: 'Array of connection objects defining from/to/type relationships',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 650 }}>
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
    connections: mockConnections,
  },
};

export const SmallTeam: Story = {
  args: {
    agents: [
      { id: 'lead', name: 'Lead', tier: 0, squad: 'design', title: 'Design Lead' },
      { id: 'designer-a', name: 'Alice', tier: 2, squad: 'design', title: 'UI Designer' },
      { id: 'designer-b', name: 'Brad', tier: 2, squad: 'design', title: 'UX Researcher' },
    ],
    connections: [
      { from: 'lead', to: 'designer-a', type: 'handoffTo' },
      { from: 'lead', to: 'designer-b', type: 'handoffTo' },
      { from: 'designer-a', to: 'designer-b', type: 'receivesFrom' },
    ],
  },
};

export const Empty: Story = {
  args: {
    agents: [],
    connections: [],
  },
};

export const SingleAgent: Story = {
  args: {
    agents: [{ id: 'solo', name: 'Solo Agent', tier: 0, squad: 'solo', title: 'Solo Orchestrator' }],
    connections: [],
  },
};
