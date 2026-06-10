import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityPanel } from './ActivityPanel';

const meta: Meta<typeof ActivityPanel> = {
  title: 'Layout/ActivityPanel',
  component: ActivityPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Side panel that displays agent activity, message history, and system metrics. Shows the currently selected agent, streaming status, execution logs, commands, and external tools.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto', display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InContainer: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          height: '700px',
          width: '320px',
          display: 'flex',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
