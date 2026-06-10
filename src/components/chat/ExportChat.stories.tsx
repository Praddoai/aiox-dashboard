import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ExportChatModal, ExportChatButton } from './ExportChat';
import type { ChatSession, Message } from '../../types';

// Helper to create mock messages
const createMockMessage = (overrides: Partial<Message>): Message => ({
  id: crypto.randomUUID(),
  role: 'user',
  content: 'Hello, can you help me?',
  timestamp: new Date().toISOString(),
  ...overrides,
});

// Mock chat session
const mockSession: ChatSession = {
  id: 'session-1',
  agentId: 'copy-assistant',
  agentName: 'Copy Assistant',
  squadId: 'copywriting',
  squadType: 'copywriting',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    createMockMessage({
      id: '1',
      role: 'user',
      content: 'Can you help me write a tagline for my coffee shop?',
      timestamp: new Date(Date.now() - 300000).toISOString(),
    }),
    createMockMessage({
      id: '2',
      role: 'agent',
      content:
        "I'd love to help! What's the vibe of your coffee shop? Is it cozy and traditional, or modern and trendy?",
      agentName: 'Copy Assistant',
      squadType: 'copywriting',
      timestamp: new Date(Date.now() - 240000).toISOString(),
    }),
    createMockMessage({
      id: '3',
      role: 'user',
      content: "It's a cozy neighborhood spot with a focus on specialty beans from small farms.",
      timestamp: new Date(Date.now() - 180000).toISOString(),
    }),
    createMockMessage({
      id: '4',
      role: 'agent',
      content: `Here are some tagline ideas:\n\n1. **"Bean there, brewed that"** - Playful and memorable\n2. **"Your neighborhood pour"** - Emphasizes community\n3. **"Small farms, big flavor"** - Highlights your sourcing\n4. **"Where every cup tells a story"** - Romantic and inviting\n\nWhich direction resonates with you?`,
      agentName: 'Copy Assistant',
      squadType: 'copywriting',
      timestamp: new Date(Date.now() - 120000).toISOString(),
    }),
  ],
};

const meta: Meta<typeof ExportChatModal> = {
  title: 'Chat/ExportChat',
  component: ExportChatModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal for exporting chat conversations in multiple formats: Markdown, JSON, plain text, and HTML. Includes live preview, copy to clipboard, and file download.',
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
      description: 'Whether the modal is visible',
    },
    onClose: {
      description: 'Callback when the modal is dismissed',
    },
    session: {
      description: 'Chat session data to export',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    session: mockSession,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: fn(),
    session: mockSession,
  },
};

export const NoSession: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    session: null,
  },
};

export const Button: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-8">
      <ExportChatButton onClick={fn()} />
      <ExportChatButton onClick={fn()} disabled />
    </div>
  ),
};
