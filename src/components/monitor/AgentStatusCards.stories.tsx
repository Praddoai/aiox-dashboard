import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlassCard, StatusDot, Badge } from '../ui';
import type { StatusType } from '../ui/StatusDot';

/**
 * AgentStatusCards uses the useAgents() hook internally.
 * We render a presentational wrapper that mirrors its output
 * so it can be previewed without live API data.
 */

interface MockAgent {
  id: string;
  name: string;
  status: StatusType;
  task: string;
  duration: string;
  model: string;
}

function AgentStatusCardsPresentation({ agents }: { agents: MockAgent[] }) {
  if (agents.length === 0) {
    return (
      <div className="glass-subtle rounded-glass p-6 text-center">
        <p className="text-sm text-secondary">Nenhum agente encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {agents.map((agent) => (
        <GlassCard key={agent.id} padding="sm" variant="subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary truncate">{agent.name}</span>
            <StatusDot
              status={agent.status}
              size="sm"
              glow={agent.status === 'working'}
              pulse={agent.status === 'working'}
            />
          </div>
          <p className="text-xs text-tertiary truncate mb-2">{agent.task}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-tertiary font-mono">{agent.duration}</span>
            <Badge size="sm" variant="default">{agent.model}</Badge>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

const mockAgents: MockAgent[] = [
  { id: 'dex', name: '@dex (Dex)', status: 'working', task: 'Implementing auth flow', duration: '2m 13s', model: 'opus' },
  { id: 'morgan', name: '@morgan (Morgan)', status: 'idle', task: '-', duration: '-', model: 'sonnet' },
  { id: 'river', name: '@river (River)', status: 'idle', task: '-', duration: '-', model: 'haiku' },
  { id: 'pax', name: '@pax (Pax)', status: 'idle', task: '-', duration: '-', model: 'sonnet' },
];

const meta: Meta<typeof AgentStatusCardsPresentation> = {
  title: 'Monitor/AgentStatusCards',
  component: AgentStatusCardsPresentation,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Grid of agent status cards showing each agent name, current task, duration, and model tier. Connects to useAgents() hook in production.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    agents: { control: 'object', description: 'Array of agent status objects' },
  },
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { agents: mockAgents },
};

export const WithActiveAgent: Story = {
  args: {
    agents: mockAgents.map((a) =>
      a.id === 'dex' ? { ...a, status: 'working' as StatusType, task: 'Running test suite', duration: '0m 45s' } : a,
    ),
  },
};

export const Empty: Story = {
  args: { agents: [] },
};

export const Loading: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-[900px]">
      {Array.from({ length: 4 }).map((_, i) => (
        <GlassCard key={i} padding="sm" variant="subtle" className="animate-pulse">
          <div className="h-4 w-24 bg-white/5 rounded mb-2" />
          <div className="h-3 w-32 bg-white/5 rounded mb-2" />
          <div className="h-3 w-16 bg-white/5 rounded" />
        </GlassCard>
      ))}
    </div>
  ),
};
