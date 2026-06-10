import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import SurfaceAlerts from './SurfaceAlerts';
import type { BobDecision } from '../../stores/bobStore';

const now = new Date().toISOString();

const mockDecisions: BobDecision[] = [
  { id: 'd1', message: 'Should we use JWT or session-based authentication?', severity: 'warning', timestamp: now, resolved: false },
  { id: 'd2', message: 'Database migration will cause 2 minutes of downtime. Proceed?', severity: 'error', timestamp: now, resolved: false },
  { id: 'd3', message: 'New dependency detected: @tanstack/react-query v5. Approve addition?', severity: 'info', timestamp: now, resolved: false },
];

const meta: Meta<typeof SurfaceAlerts> = {
  title: 'Bob/SurfaceAlerts',
  component: SurfaceAlerts,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Decision cards requiring human acknowledgment during Bob orchestration. Color-coded by severity (info, warning, error) with animated entry/exit.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onResolve: { action: 'resolved' },
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSeverities: Story = {
  args: {
    decisions: mockDecisions,
    onResolve: fn(),
  },
};

export const WarningOnly: Story = {
  args: {
    decisions: [mockDecisions[0]],
    onResolve: fn(),
  },
};

export const ErrorOnly: Story = {
  args: {
    decisions: [mockDecisions[1]],
    onResolve: fn(),
  },
};

export const AllResolved: Story = {
  args: {
    decisions: mockDecisions.map((d) => ({ ...d, resolved: true })),
    onResolve: fn(),
  },
};

export const NoPending: Story = {
  args: {
    decisions: [],
    onResolve: fn(),
  },
};
