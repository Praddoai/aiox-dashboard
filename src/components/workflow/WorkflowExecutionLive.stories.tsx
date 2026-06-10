import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WorkflowExecutionLive } from './WorkflowExecutionLive';
import type { LiveExecutionState, LiveExecutionStep } from '../../hooks/useWorkflows';

const makeStep = (overrides: Partial<LiveExecutionStep> & { id: string }): LiveExecutionStep => ({
  type: 'task',
  status: 'pending',
  ...overrides,
});

const baseMockState: LiveExecutionState = {
  executionId: 'exec-abc123',
  workflowId: 'wf-001',
  workflowName: 'Content Campaign',
  status: 'running',
  startedAt: new Date(Date.now() - 120_000).toISOString(),
  steps: [
    makeStep({
      id: 'step-1',
      status: 'completed',
      name: 'Research',
      config: { squadId: 'copywriting', agentId: 'ana', role: 'researcher' },
      startedAt: new Date(Date.now() - 120_000).toISOString(),
      completedAt: new Date(Date.now() - 80_000).toISOString(),
      output: {
        agent: { name: 'Ana', squad: 'copywriting' },
        role: 'researcher',
        response: 'Market analysis completed. Key trends identified in the target segment.',
        llmMetadata: { provider: 'anthropic', model: 'claude-3-opus', inputTokens: 1200, outputTokens: 850 },
      },
    }),
    makeStep({
      id: 'step-2',
      status: 'running',
      name: 'Draft Copy',
      config: { squadId: 'copywriting', agentId: 'bob', role: 'writer' },
      startedAt: new Date(Date.now() - 40_000).toISOString(),
      output: {
        agent: { name: 'Bob', squad: 'copywriting' },
        role: 'writer',
      },
    }),
    makeStep({
      id: 'step-3',
      status: 'pending',
      name: 'Visual Design',
      config: { squadId: 'design', agentId: 'leo', role: 'designer' },
    }),
  ],
  input: { demand: 'Create a full marketing campaign for Q3 product launch' },
};

const completedState: LiveExecutionState = {
  ...baseMockState,
  status: 'completed',
  completedAt: new Date().toISOString(),
  steps: baseMockState.steps.map((s) => ({
    ...s,
    status: 'completed' as const,
    completedAt: new Date().toISOString(),
    output: s.output || {
      agent: { name: 'Agent', squad: 'design' },
      role: 'designer',
      response: 'Visual assets created successfully.',
    },
  })),
};

const failedState: LiveExecutionState = {
  ...baseMockState,
  status: 'failed',
  error: 'LLM provider timeout after 30s. Please retry.',
  steps: [
    baseMockState.steps[0],
    { ...baseMockState.steps[1], status: 'failed', error: 'Connection timeout' },
    baseMockState.steps[2],
  ],
};

const connectingState: LiveExecutionState = {
  executionId: null,
  workflowId: 'wf-001',
  workflowName: 'Content Campaign',
  status: 'connecting',
  steps: [],
};

const meta: Meta<typeof WorkflowExecutionLive> = {
  title: 'Workflow/WorkflowExecutionLive',
  component: WorkflowExecutionLive,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-screen live workflow execution view with canvas visualization, step log sidebar, and node detail panel. Streams execution state in real-time.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'closed' },
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

export const Running: Story = {
  args: {
    state: baseMockState,
    onClose: fn(),
  },
};

export const Completed: Story = {
  args: {
    state: completedState,
    onClose: fn(),
  },
};

export const Failed: Story = {
  args: {
    state: failedState,
    onClose: fn(),
  },
};

export const Connecting: Story = {
  args: {
    state: connectingState,
    onClose: fn(),
  },
};

export const WithOrchestrationPlan: Story = {
  args: {
    state: baseMockState,
    onClose: fn(),
    orchestrationPlan: {
      analysis: 'The demand requires copywriting and design squads working in sequence.',
      expectedOutputs: ['Blog post draft', 'Social media copy', 'Visual banner'],
      planSteps: [
        { id: 's1', name: 'Research', squadId: 'copywriting', agentId: 'ana', role: 'researcher', description: 'Market analysis' },
        { id: 's2', name: 'Draft', squadId: 'copywriting', agentId: 'bob', role: 'writer', description: 'Write copy' },
      ],
      phase: 'planning',
    },
  },
};
