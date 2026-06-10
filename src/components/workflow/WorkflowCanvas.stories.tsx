import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WorkflowCanvas } from './WorkflowCanvas';
import type { WorkflowNode, WorkflowEdge } from './types';

const mockNodes: WorkflowNode[] = [
  {
    id: 'start',
    type: 'start',
    label: 'Inicio',
    status: 'completed',
    position: { x: 50, y: 200 },
  },
  {
    id: 'agent-1',
    type: 'agent',
    label: 'Copywriter',
    agentName: 'Ana',
    squadType: 'copywriting',
    status: 'completed',
    position: { x: 300, y: 180 },
    progress: 100,
  },
  {
    id: 'agent-2',
    type: 'agent',
    label: 'Designer',
    agentName: 'Leo',
    squadType: 'design',
    status: 'active',
    position: { x: 550, y: 220 },
    progress: 60,
    currentAction: 'Generating visual layout...',
  },
  {
    id: 'agent-3',
    type: 'agent',
    label: 'Creator',
    agentName: 'Mia',
    squadType: 'creator',
    status: 'idle',
    position: { x: 800, y: 180 },
    progress: 0,
  },
  {
    id: 'checkpoint-1',
    type: 'checkpoint',
    label: 'Review',
    status: 'idle',
    position: { x: 1050, y: 200 },
  },
  {
    id: 'end',
    type: 'end',
    label: 'Fim',
    status: 'idle',
    position: { x: 1250, y: 200 },
  },
];

const mockEdges: WorkflowEdge[] = [
  { id: 'e-start-1', source: 'start', target: 'agent-1', status: 'completed' },
  { id: 'e-1-2', source: 'agent-1', target: 'agent-2', status: 'completed' },
  { id: 'e-2-3', source: 'agent-2', target: 'agent-3', status: 'active', animated: true },
  { id: 'e-3-cp', source: 'agent-3', target: 'checkpoint-1', status: 'idle' },
  { id: 'e-cp-end', source: 'checkpoint-1', target: 'end', status: 'idle' },
];

const meta: Meta<typeof WorkflowCanvas> = {
  title: 'Workflow/WorkflowCanvas',
  component: WorkflowCanvas,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Interactive visual canvas that renders workflow nodes and edges with pan, zoom, and selection. Supports agent, start, end, and checkpoint node types.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    zoom: {
      control: { type: 'range', min: 0.5, max: 2, step: 0.1 },
      description: 'Canvas zoom level',
    },
    selectedNodeId: {
      control: 'text',
      description: 'Currently selected node ID',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto', background: '#0d1015' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    nodes: mockNodes,
    edges: mockEdges,
    zoom: 0.85,
    onZoomChange: fn(),
    selectedNodeId: null,
    onSelectNode: fn(),
  },
};

export const WithSelectedNode: Story = {
  args: {
    nodes: mockNodes,
    edges: mockEdges,
    zoom: 0.85,
    onZoomChange: fn(),
    selectedNodeId: 'agent-2',
    onSelectNode: fn(),
  },
};

export const AllCompleted: Story = {
  args: {
    nodes: mockNodes.map((n) => ({ ...n, status: 'completed' as const, progress: n.type === 'agent' ? 100 : undefined })),
    edges: mockEdges.map((e) => ({ ...e, status: 'completed' as const, animated: false })),
    zoom: 0.85,
    onZoomChange: fn(),
    selectedNodeId: null,
    onSelectNode: fn(),
  },
};

export const ZoomedIn: Story = {
  args: {
    nodes: mockNodes,
    edges: mockEdges,
    zoom: 1.5,
    onZoomChange: fn(),
    selectedNodeId: null,
    onSelectNode: fn(),
  },
};

export const EmptyCanvas: Story = {
  args: {
    nodes: [],
    edges: [],
    zoom: 1,
    onZoomChange: fn(),
    selectedNodeId: null,
    onSelectNode: fn(),
  },
};
