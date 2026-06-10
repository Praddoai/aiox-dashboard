import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Cpu, RefreshCw } from 'lucide-react';
import { GlassButton, Badge, SectionLabel } from '../ui';
import type { Pipeline, BobAgent } from '../../stores/bobStore';
import PipelineVisualizer from './PipelineVisualizer';
import AgentActivityCard from './AgentActivityCard';
import SurfaceAlerts from './SurfaceAlerts';
import ExecutionLog from './ExecutionLog';

/**
 * BobOrchestration uses useBobStore internally. This shell renders
 * the composed layout using the same sub-components with mock data.
 */

const mockPipeline: Pipeline = {
  status: 'active',
  currentPhase: 'implementation',
  phases: [
    { id: 'p1', label: 'Story Creation', status: 'completed', duration: '1m 23s' },
    { id: 'p2', label: 'Validation', status: 'completed', duration: '0m 45s' },
    { id: 'p3', label: 'Implementation', status: 'in_progress', progress: 60 },
    { id: 'p4', label: 'QA Gate', status: 'pending' },
  ],
  agents: [
    { id: 'a1', name: '@river (River)', task: 'Story creation finished', status: 'completed' },
    { id: 'a2', name: '@pax (Pax)', task: 'Validation passed', status: 'completed' },
    { id: 'a3', name: '@dex (Dex)', task: 'Implementing auth module', status: 'working' },
    { id: 'a4', name: '@qa (Quinn)', task: 'Waiting for implementation', status: 'waiting' },
  ],
  errors: [],
  decisions: [
    { id: 'd1', message: 'Should we use JWT or session-based auth?', severity: 'warning', timestamp: new Date().toISOString(), resolved: false },
  ],
};

const mockLogEntries = [
  { id: 'l1', timestamp: new Date(Date.now() - 120_000).toISOString(), message: 'Story 2.3 created', agent: '@river', type: 'action' as const },
  { id: 'l2', timestamp: new Date(Date.now() - 90_000).toISOString(), message: 'Story validated: GO (score 9/10)', agent: '@pax', type: 'info' as const },
  { id: 'l3', timestamp: new Date(Date.now() - 30_000).toISOString(), message: 'Decision required: auth strategy', agent: '@dex', type: 'decision' as const },
];

function BobOrchestrationShell({ isActive, pipeline }: { isActive: boolean; pipeline: Pipeline | null }) {
  if (!isActive || !pipeline) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl glass-subtle mx-auto mb-4">
            <Cpu className="h-8 w-8 text-tertiary" />
          </div>
          <h2 className="text-lg font-semibold text-primary mb-1">No active orchestration</h2>
          <p className="text-sm text-secondary">Bob orchestration will appear here when a pipeline is running.</p>
        </div>
      </div>
    );
  }

  const currentAgentId = pipeline.agents.find((a: BobAgent) => a.status === 'working')?.id;

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-bold text-primary">Bob Orchestration</h1>
          <Badge variant="status" status={pipeline.status === 'active' ? 'online' : pipeline.status === 'failed' ? 'error' : 'offline'} size="sm">
            {pipeline.status}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-secondary font-mono">Session: 03m 12s | Story: 01m 45s</span>
          <GlassButton size="sm" variant="ghost" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={fn()}>
            Reset
          </GlassButton>
        </div>
      </div>

      {/* Pipeline */}
      <section className="mb-6">
        <SectionLabel>Pipeline Progress</SectionLabel>
        <PipelineVisualizer pipeline={pipeline} />
      </section>

      {/* Agents */}
      <section className="mb-6">
        <SectionLabel count={pipeline.agents.length}>Agent Activity</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pipeline.agents.map((agent: BobAgent) => (
            <AgentActivityCard key={agent.id} agent={agent} isCurrent={agent.id === currentAgentId} />
          ))}
        </div>
      </section>

      {/* Decisions */}
      <section className="mb-6">
        <SectionLabel count={pipeline.decisions.filter((d) => !d.resolved).length}>Decisions Needed</SectionLabel>
        <SurfaceAlerts decisions={pipeline.decisions} onResolve={fn()} />
      </section>

      {/* Log */}
      <section>
        <SectionLabel count={mockLogEntries.length}>Execution Log</SectionLabel>
        <ExecutionLog entries={mockLogEntries} />
      </section>
    </div>
  );
}

const meta: Meta<typeof BobOrchestrationShell> = {
  title: 'Bob/BobOrchestration',
  component: BobOrchestrationShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Bob orchestration dashboard displaying pipeline progress, agent activity cards, pending decisions, and execution log. Composition of PipelineVisualizer, AgentActivityCard, SurfaceAlerts, and ExecutionLog.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isActive: { control: 'boolean', description: 'Whether a pipeline is currently active' },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: { isActive: true, pipeline: mockPipeline },
};

export const Inactive: Story = {
  args: { isActive: false, pipeline: null },
};

export const CompletedPipeline: Story = {
  args: {
    isActive: true,
    pipeline: {
      ...mockPipeline,
      status: 'completed',
      phases: mockPipeline.phases.map((p) => ({ ...p, status: 'completed' as const, duration: p.duration || '0m 30s' })),
      agents: mockPipeline.agents.map((a) => ({ ...a, status: 'completed' as const })),
      decisions: mockPipeline.decisions.map((d) => ({ ...d, resolved: true })),
    },
  },
};
