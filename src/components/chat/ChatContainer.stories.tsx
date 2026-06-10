import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatContainer } from './ChatContainer';

const meta: Meta<typeof ChatContainer> = {
  title: 'Chat/ChatContainer',
  component: ChatContainer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main chat container orchestrating the conversation sidebar, message list, chat header, and input area. Depends on useChat, useChatStore, and useUIStore for state management.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ChatContainer is a highly connected component that depends on multiple stores
// (chatStore, uiStore) and hooks (useChat, useAgents, useSquads). In Storybook,
// it will render its EmptyChat state (squad selection) since no agent is selected.

export const Default: Story = {
  render: () => (
    <div style={{ height: '100vh' }}>
      <ChatContainer />
    </div>
  ),
};

export const LayoutShowcase: Story = {
  name: 'Layout Structure',
  render: () => (
    <div style={{ height: '100vh' }} className="flex">
      {/* Conversation sidebar mockup */}
      <div className="w-[240px] flex-shrink-0 border-r border-glass-border flex flex-col h-full">
        <div className="px-3 py-3 border-b border-glass-border flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">Conversas</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 py-8 text-center">
            <p className="text-tertiary text-xs">Nenhuma conversa ainda</p>
          </div>
        </div>
      </div>

      {/* Main chat area mockup */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 glass border-b border-glass-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-500/20" />
          <div>
            <h2 className="text-primary font-semibold">Agent Name</h2>
            <p className="text-secondary text-sm">Role description</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex items-center justify-center">
          <p className="text-tertiary text-sm">Select an agent to start chatting</p>
        </div>

        {/* Input */}
        <div className="p-4 pt-0">
          <div className="glass rounded-xl px-4 py-3 border border-glass-border">
            <p className="text-tertiary text-sm">Type a message...</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
