import type { Meta, StoryObj } from '@storybook/react-vite';
import { SquadOrgChart } from './SquadOrgChart';
import type { AgentSummary } from '../../types';

const fullTeam: AgentSummary[] = [
  { id: 'chief-dev', name: 'Chief Dev', tier: 0, squad: 'full-stack-dev', title: 'Squad Orchestrator', icon: 'CD' },
  { id: 'aria', name: 'Aria', tier: 1, squad: 'full-stack-dev', title: 'System Architect' },
  { id: 'river', name: 'River', tier: 1, squad: 'full-stack-dev', title: 'Scrum Master' },
  { id: 'dex', name: 'Dex', tier: 2, squad: 'full-stack-dev', title: 'Senior Developer' },
  { id: 'quinn', name: 'Quinn', tier: 2, squad: 'full-stack-dev', title: 'QA Engineer' },
  { id: 'gage', name: 'Gage', tier: 2, squad: 'full-stack-dev', title: 'DevOps Engineer' },
  { id: 'morgan', name: 'Morgan', tier: 2, squad: 'full-stack-dev', title: 'Product Manager' },
];

const specialistsOnly: AgentSummary[] = [
  { id: 'spec-1', name: 'Alice', tier: 2, squad: 'design', title: 'UI Designer' },
  { id: 'spec-2', name: 'Brad', tier: 2, squad: 'design', title: 'UX Researcher' },
  { id: 'spec-3', name: 'Carol', tier: 2, squad: 'design', title: 'Motion Designer' },
];

const meta: Meta<typeof SquadOrgChart> = {
  title: 'Squads/SquadOrgChart',
  component: SquadOrgChart,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Organizational chart for a squad. Agents are grouped and displayed by tier (Orchestrator, Master, Specialist) in a hierarchical layout with connecting lines between tier levels.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    agents: {
      control: false,
      description: 'Array of agent summaries to display in the org chart',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 700 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FullTeam: Story = {
  args: {
    agents: fullTeam,
  },
};

export const SpecialistsOnly: Story = {
  args: {
    agents: specialistsOnly,
  },
};

export const SingleOrchestrator: Story = {
  args: {
    agents: [{ id: 'solo', name: 'Bob', tier: 0, squad: 'orchestrator', title: 'Global Orchestrator' }],
  },
};

export const Empty: Story = {
  args: {
    agents: [],
  },
};
