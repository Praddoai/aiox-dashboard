import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentInteractionPanel } from './AgentInteractionPanel';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper(props: React.ComponentProps<typeof AgentInteractionPanel>) {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: 340, height: 600, background: '#0d0d1a', borderRadius: 12, overflow: 'hidden' }}>
        <AgentInteractionPanel {...props} />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof AgentInteractionPanel> = {
  title: 'World/AgentInteractionPanel',
  component: AgentInteractionPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Side panel for interacting with an agent. Contains tabs for chat, profile, and commands. Integrates with the chat store and agent API hooks.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    agentId: { control: 'text', description: 'ID of the agent to display' },
    roomId: { control: 'text', description: 'ID of the room the agent is in' },
    onClose: { description: 'Called when the close button is clicked' },
    onStartChat: { description: 'Called when a chat is initiated' },
  },
  render: (args) => <Wrapper {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    agentId: 'agent-dex-001',
    roomId: 'full-stack-dev',
    onClose: fn(),
    onStartChat: fn(),
  },
};

export const ContentAgent: Story = {
  args: {
    agentId: 'agent-copy-001',
    roomId: 'copywriting',
    onClose: fn(),
    onStartChat: fn(),
  },
};

export const SalesAgent: Story = {
  args: {
    agentId: 'agent-sales-001',
    roomId: 'media-buy',
    onClose: fn(),
    onStartChat: fn(),
  },
};
