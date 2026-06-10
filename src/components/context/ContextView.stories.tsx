import type { Meta, StoryObj } from '@storybook/react-vite';
import ContextView from './ContextView';

const meta: Meta<typeof ContextView> = {
  title: 'Views/ContextView',
  component: ContextView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Context management view displaying the active AIOS framework state. Shows collapsible sections for Active Rules, Agent Definitions, Config Files, MCP Servers (with status dots), and Recent Files. Uses mock data inline.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InNarrowViewport: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', maxWidth: 480, background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};

export const InWideViewport: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', maxWidth: 1200, background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};
