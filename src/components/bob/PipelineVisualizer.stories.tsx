import type { Meta, StoryObj } from '@storybook/react-vite';
import PipelineVisualizer from './PipelineVisualizer';
import type { Pipeline } from '../../stores/bobStore';

const activePipeline: Pipeline = {
  status: 'active',
  currentPhase: 'implementation',
  phases: [
    { id: 'p1', label: 'Story Creation', status: 'completed', duration: '1m 23s' },
    { id: 'p2', label: 'Validation', status: 'completed', duration: '0m 45s' },
    { id: 'p3', label: 'Implementation', status: 'in_progress', progress: 65 },
    { id: 'p4', label: 'QA Gate', status: 'pending' },
  ],
  agents: [],
  errors: [],
  decisions: [],
};

const completedPipeline: Pipeline = {
  status: 'completed',
  currentPhase: 'qa-gate',
  phases: [
    { id: 'p1', label: 'Story Creation', status: 'completed', duration: '1m 23s' },
    { id: 'p2', label: 'Validation', status: 'completed', duration: '0m 45s' },
    { id: 'p3', label: 'Implementation', status: 'completed', duration: '5m 12s' },
    { id: 'p4', label: 'QA Gate', status: 'completed', duration: '2m 01s' },
  ],
  agents: [],
  errors: [],
  decisions: [],
};

const failedPipeline: Pipeline = {
  status: 'failed',
  currentPhase: 'implementation',
  phases: [
    { id: 'p1', label: 'Story Creation', status: 'completed', duration: '1m 23s' },
    { id: 'p2', label: 'Validation', status: 'completed', duration: '0m 45s' },
    { id: 'p3', label: 'Implementation', status: 'failed' },
    { id: 'p4', label: 'QA Gate', status: 'pending' },
  ],
  agents: [],
  errors: [{ id: 'err1', message: 'Build failed', source: '@dex', timestamp: new Date().toISOString() }],
  decisions: [],
};

const earlyPipeline: Pipeline = {
  status: 'active',
  currentPhase: 'story-creation',
  phases: [
    { id: 'p1', label: 'Story Creation', status: 'in_progress', progress: 30 },
    { id: 'p2', label: 'Validation', status: 'pending' },
    { id: 'p3', label: 'Implementation', status: 'pending' },
    { id: 'p4', label: 'QA Gate', status: 'pending' },
  ],
  agents: [],
  errors: [],
  decisions: [],
};

const meta: Meta<typeof PipelineVisualizer> = {
  title: 'Bob/PipelineVisualizer',
  component: PipelineVisualizer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Vertical pipeline visualization showing phases with status icons, connecting lines, and an overall progress bar. Supports completed, in-progress, pending, and failed states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    pipeline: { control: 'object', description: 'Pipeline data object' },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: { pipeline: activePipeline },
};

export const Completed: Story = {
  args: { pipeline: completedPipeline },
};

export const Failed: Story = {
  args: { pipeline: failedPipeline },
};

export const EarlyPhase: Story = {
  args: { pipeline: earlyPipeline },
};
