import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentExplorer } from './AgentExplorer';

const meta: Meta<typeof AgentExplorer> = {
  title: 'Agents/AgentExplorer',
  component: AgentExplorer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full-screen agent exploration overlay with search, tier/squad filters, and a detail panel. Relies on useAgents, useSquads, useAgent, and useChat hooks for data.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the explorer overlay is visible',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when the explorer is closed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: fn(),
  },
};
