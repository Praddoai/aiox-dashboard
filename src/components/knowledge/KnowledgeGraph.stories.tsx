import type { Meta, StoryObj } from '@storybook/react-vite';
import { KnowledgeGraph } from './KnowledgeGraph';
import type { KnowledgeOverview, AgentKnowledge } from '../../hooks/useKnowledge';

const mockOverview: KnowledgeOverview = {
  totalFiles: 42,
  totalDirectories: 8,
  totalSize: 256000,
  byExtension: { ts: 20, tsx: 12, md: 5, json: 3, yaml: 2 },
  recentFiles: [
    { name: 'index.ts', path: 'src/index.ts', size: 1200, extension: 'ts', modified: new Date().toISOString() },
    { name: 'App.tsx', path: 'src/App.tsx', size: 3400, extension: 'tsx', modified: new Date().toISOString() },
    { name: 'utils.ts', path: 'src/lib/utils.ts', size: 800, extension: 'ts', modified: new Date().toISOString() },
    { name: 'config.yaml', path: 'config/config.yaml', size: 450, extension: 'yaml', modified: new Date().toISOString() },
  ],
};

const mockAgentKnowledge: AgentKnowledge[] = [
  { agentId: 'dex', agentName: 'Dex', squadId: 'development', knowledgePath: 'agents/dex', files: 12 },
  { agentId: 'morgan', agentName: 'Morgan', squadId: 'orchestrator', knowledgePath: 'agents/morgan', files: 8 },
  { agentId: 'river', agentName: 'River', squadId: 'orchestrator', knowledgePath: 'agents/river', files: 5 },
];

const mockAgentsBySquad: Record<string, AgentKnowledge[]> = {
  development: [mockAgentKnowledge[0]],
  orchestrator: [mockAgentKnowledge[1], mockAgentKnowledge[2]],
};

const meta: Meta<typeof KnowledgeGraph> = {
  title: 'Knowledge/KnowledgeGraph',
  component: KnowledgeGraph,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Interactive force-directed graph visualizing knowledge base structure — agents, directories, and files as connected nodes with zoom and pan controls.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', display: 'flex', background: '#0a0a0f' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    overview: mockOverview,
    agentKnowledge: mockAgentKnowledge,
    agentsBySquad: mockAgentsBySquad,
  },
};

export const Empty: Story = {
  args: {
    overview: undefined,
    agentKnowledge: [],
    agentsBySquad: {},
  },
};
