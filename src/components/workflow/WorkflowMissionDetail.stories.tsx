import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WorkflowMissionDetail } from './WorkflowMissionDetail';
import type { WorkflowMission } from './types';

const mockMission: WorkflowMission = {
  id: 'mission-001',
  name: 'Q3 Marketing Campaign',
  description:
    'End-to-end marketing campaign including copy, visuals, and social media content for the upcoming product launch.',
  status: 'in-progress',
  startedAt: new Date(Date.now() - 3600_000).toISOString(),
  progress: 65,
  nodes: [
    {
      id: 'n1',
      type: 'agent',
      label: 'Market Research',
      agentName: 'Ana',
      squadType: 'copywriting',
      status: 'completed',
      position: { x: 0, y: 0 },
      progress: 100,
    },
    {
      id: 'n2',
      type: 'agent',
      label: 'Draft Copy',
      agentName: 'Bob',
      squadType: 'copywriting',
      status: 'active',
      position: { x: 200, y: 0 },
      progress: 70,
    },
    {
      id: 'n3',
      type: 'checkpoint',
      label: 'Copy Review',
      status: 'waiting',
      position: { x: 400, y: 0 },
    },
    {
      id: 'n4',
      type: 'agent',
      label: 'Visual Design',
      agentName: 'Leo',
      squadType: 'design',
      status: 'idle',
      position: { x: 600, y: 0 },
      progress: 0,
    },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', status: 'completed' },
    { id: 'e2', source: 'n2', target: 'n3', status: 'active', animated: true },
    { id: 'e3', source: 'n3', target: 'n4', status: 'idle' },
  ],
  agents: [
    { id: 'a1', name: 'Ana', squadType: 'copywriting', role: 'Researcher', status: 'completed' },
    { id: 'a2', name: 'Bob', squadType: 'copywriting', role: 'Copywriter', status: 'working', currentTask: 'Drafting headlines' },
    { id: 'a3', name: 'Leo', squadType: 'design', role: 'Visual Designer', status: 'waiting' },
  ],
};

const completedMission: WorkflowMission = {
  ...mockMission,
  id: 'mission-002',
  status: 'completed',
  progress: 100,
  completedAt: new Date().toISOString(),
  nodes: mockMission.nodes.map((n) => ({
    ...n,
    status: 'completed' as const,
    progress: n.type === 'agent' ? 100 : undefined,
  })),
  agents: mockMission.agents.map((a) => ({ ...a, status: 'completed' as const })),
};

const meta: Meta<typeof WorkflowMissionDetail> = {
  title: 'Workflow/WorkflowMissionDetail',
  component: WorkflowMissionDetail,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal dialog displaying detailed mission information including progress, agent activity, and workflow step statuses.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'closed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
  args: {
    mission: mockMission,
    onClose: fn(),
  },
};

export const Completed: Story = {
  args: {
    mission: completedMission,
    onClose: fn(),
  },
};

export const FewAgents: Story = {
  args: {
    mission: {
      ...mockMission,
      id: 'mission-003',
      name: 'Quick Bug Fix',
      description: 'Simple single-agent fix for a critical production issue.',
      progress: 40,
      agents: [mockMission.agents[0]],
      nodes: [mockMission.nodes[0]],
      edges: [],
    },
    onClose: fn(),
  },
};
