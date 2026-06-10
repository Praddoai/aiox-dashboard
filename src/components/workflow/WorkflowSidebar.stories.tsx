import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WorkflowSidebar } from './WorkflowSidebar';
import type { WorkflowMission, WorkflowOperation } from './types';

const mockMission: WorkflowMission = {
  id: 'mission-001',
  name: 'Content Pipeline',
  description: 'Automated content creation pipeline with copywriting, design, and publishing stages.',
  status: 'in-progress',
  startedAt: new Date(Date.now() - 1800_000).toISOString(),
  progress: 55,
  nodes: [
    { id: 'n1', type: 'agent', label: 'Research', agentName: 'Ana', squadType: 'copywriting', status: 'completed', position: { x: 0, y: 0 }, progress: 100 },
    { id: 'n2', type: 'agent', label: 'Write', agentName: 'Bob', squadType: 'copywriting', status: 'active', position: { x: 200, y: 0 }, progress: 60 },
    { id: 'n3', type: 'agent', label: 'Design', agentName: 'Leo', squadType: 'design', status: 'idle', position: { x: 400, y: 0 } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', status: 'completed' },
    { id: 'e2', source: 'n2', target: 'n3', status: 'idle' },
  ],
  agents: [
    { id: 'a1', name: 'Ana', squadType: 'copywriting', role: 'Researcher', status: 'completed', currentTask: 'Research done' },
    { id: 'a2', name: 'Bob', squadType: 'copywriting', role: 'Writer', status: 'working', currentTask: 'Writing draft...' },
    { id: 'a3', name: 'Leo', squadType: 'design', role: 'Designer', status: 'waiting', currentTask: 'Awaiting copy' },
  ],
};

const mockOperations: WorkflowOperation[] = [
  { id: 'op1', missionId: 'mission-001', agentName: 'Ana', squadType: 'copywriting', action: 'Completed market research analysis', status: 'completed', startedAt: new Date(Date.now() - 1200_000).toISOString(), duration: 45 },
  { id: 'op2', missionId: 'mission-001', agentName: 'Bob', squadType: 'copywriting', action: 'Writing campaign headline variants', status: 'running', startedAt: new Date(Date.now() - 300_000).toISOString() },
  { id: 'op3', missionId: 'mission-001', agentName: 'Leo', squadType: 'design', action: 'Create visual banner', status: 'pending', startedAt: new Date(Date.now() - 60_000).toISOString() },
];

const meta: Meta<typeof WorkflowSidebar> = {
  title: 'Workflow/WorkflowSidebar',
  component: WorkflowSidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Sidebar for workflow management showing mission progress, active agents, and operation log with status badges.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedNodeId: { control: 'text', description: 'Currently selected node ID' },
    onSelectNode: { action: 'nodeSelected' },
    onViewMission: { action: 'viewMission' },
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

export const Default: Story = {
  args: {
    mission: mockMission,
    operations: mockOperations,
    selectedNodeId: null,
    onSelectNode: fn(),
    onViewMission: fn(),
  },
};

export const WithSelection: Story = {
  args: {
    mission: mockMission,
    operations: mockOperations,
    selectedNodeId: 'n2',
    onSelectNode: fn(),
    onViewMission: fn(),
  },
};

export const AllCompleted: Story = {
  args: {
    mission: {
      ...mockMission,
      progress: 100,
      status: 'completed',
      agents: mockMission.agents.map((a) => ({ ...a, status: 'completed' as const })),
    },
    operations: mockOperations.map((o) => ({ ...o, status: 'completed' as const, duration: 30 })),
    selectedNodeId: null,
    onSelectNode: fn(),
    onViewMission: fn(),
  },
};
