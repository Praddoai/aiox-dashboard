import type { Meta, StoryObj } from '@storybook/react-vite';
import ExecutionLog from './ExecutionLog';
import type { ExecutionLogEntry } from '../../stores/bobStore';

const now = Date.now();

const mockEntries: ExecutionLogEntry[] = [
  { id: 'l1', timestamp: new Date(now - 300_000).toISOString(), message: 'Pipeline started for Story 2.3', agent: 'System', type: 'info' },
  { id: 'l2', timestamp: new Date(now - 240_000).toISOString(), message: 'Creating story from epic context', agent: '@river', type: 'action' },
  { id: 'l3', timestamp: new Date(now - 180_000).toISOString(), message: 'Story 2.3 draft created', agent: '@river', type: 'action' },
  { id: 'l4', timestamp: new Date(now - 120_000).toISOString(), message: 'Validation score: 9/10 (GO)', agent: '@pax', type: 'info' },
  { id: 'l5', timestamp: new Date(now - 90_000).toISOString(), message: 'Architecture decision needed: auth strategy', agent: '@dex', type: 'decision' },
  { id: 'l6', timestamp: new Date(now - 60_000).toISOString(), message: 'Implementing auth module...', agent: '@dex', type: 'action' },
  { id: 'l7', timestamp: new Date(now - 30_000).toISOString(), message: 'Type error in AuthProvider.tsx:42', agent: '@dex', type: 'error' },
];

const meta: Meta<typeof ExecutionLog> = {
  title: 'Bob/ExecutionLog',
  component: ExecutionLog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Scrollable execution log with color-coded type badges (INFO, ACTION, DECISION, ERROR), timestamps, and agent attribution.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    entries: { control: 'object', description: 'Array of log entries to display' },
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { entries: mockEntries },
};

export const ErrorsOnly: Story = {
  args: { entries: mockEntries.filter((e) => e.type === 'error') },
};

export const Empty: Story = {
  args: { entries: [] },
};

export const SingleEntry: Story = {
  args: { entries: [mockEntries[0]] },
};
