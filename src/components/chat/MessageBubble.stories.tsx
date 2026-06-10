import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../../types';

const meta: Meta<typeof MessageBubble> = {
  title: 'Chat/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Message bubble component for chat conversations.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showAvatar: {
      control: 'boolean',
      description: 'Show avatar for agent messages',
    },
    showTimestamp: {
      control: 'boolean',
      description: 'Show message timestamp',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto space-y-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const createMessage = (overrides: Partial<Message>): Message => ({
  id: '1',
  role: 'user',
  content: 'Hello, how can you help me?',
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const UserMessage: Story = {
  args: {
    message: createMessage({
      role: 'user',
      content: 'Can you help me write a product description for an eco-friendly water bottle?',
    }),
  },
};

export const AgentMessage: Story = {
  args: {
    message: createMessage({
      role: 'agent',
      content: "Of course! I'd be happy to help you craft a compelling product description. Could you tell me more about the water bottle's key features and target audience?",
      agentName: 'Copy Assistant',
      squadType: 'copywriting',
    }),
  },
};

export const AgentWithMarkdown: Story = {
  args: {
    message: createMessage({
      role: 'agent',
      content: `Here's a draft for your eco-friendly water bottle:

## EcoFlow Premium Water Bottle

**Key Features:**
- Made from 100% recycled materials
- Double-wall vacuum insulation
- Keeps drinks cold for 24 hours

### Why Choose EcoFlow?

1. **Sustainable**: Every bottle saves 1,000 plastic bottles from landfills
2. **Durable**: Built to last a lifetime
3. **Stylish**: Available in 6 stunning colors

> "The best bottle for the planet and your lifestyle"
`,
      agentName: 'Copy Assistant',
      squadType: 'copywriting',
    }),
  },
};

export const StreamingMessage: Story = {
  args: {
    message: createMessage({
      role: 'agent',
      content: 'Let me think about that for a moment...',
      agentName: 'Design Agent',
      squadType: 'design',
      isStreaming: true,
    }),
  },
};

export const StreamingEmpty: Story = {
  args: {
    message: createMessage({
      role: 'agent',
      content: '',
      agentName: 'Creator Bot',
      squadType: 'creator',
      isStreaming: true,
    }),
  },
};

export const SystemMessage: Story = {
  args: {
    message: createMessage({
      role: 'system',
      content: 'Agent joined the conversation',
    }),
  },
};

export const WithoutAvatar: Story = {
  args: {
    message: createMessage({
      role: 'agent',
      content: 'This message is shown without an avatar.',
      agentName: 'Assistant',
    }),
    showAvatar: false,
  },
};

export const WithoutTimestamp: Story = {
  args: {
    message: createMessage({
      role: 'agent',
      content: 'This message is shown without a timestamp.',
      agentName: 'Assistant',
      squadType: 'orchestrator',
    }),
    showTimestamp: false,
  },
};

export const LongMessage: Story = {
  args: {
    message: createMessage({
      role: 'user',
      content: `I need help creating a comprehensive marketing strategy for my new startup. We're building an AI-powered productivity app that helps remote workers manage their time better. Our target audience is primarily knowledge workers aged 25-45 who work from home at least 3 days a week. We have a limited budget of $10,000 for the initial marketing push and need to maximize our reach. Can you provide a detailed plan covering social media, content marketing, and paid advertising?`,
    }),
  },
};

export const Conversation: Story = {
  render: () => (
    <div className="space-y-4">
      <MessageBubble
        message={createMessage({
          id: '1',
          role: 'user',
          content: 'Can you help me write a tagline for my coffee shop?',
          timestamp: new Date(Date.now() - 60000 * 5).toISOString(),
        })}
      />
      <MessageBubble
        message={createMessage({
          id: '2',
          role: 'agent',
          content: "I'd love to help! What's the vibe of your coffee shop? Is it cozy and traditional, or modern and trendy?",
          agentName: 'Copy Assistant',
          squadType: 'copywriting',
          timestamp: new Date(Date.now() - 60000 * 4).toISOString(),
        })}
      />
      <MessageBubble
        message={createMessage({
          id: '3',
          role: 'user',
          content: "It's a cozy neighborhood spot with a focus on specialty beans from small farms.",
          timestamp: new Date(Date.now() - 60000 * 3).toISOString(),
        })}
      />
      <MessageBubble
        message={createMessage({
          id: '4',
          role: 'agent',
          content: `Here are some tagline ideas:

1. **"Bean there, brewed that"** - Playful and memorable
2. **"Your neighborhood pour"** - Emphasizes community
3. **"Small farms, big flavor"** - Highlights your sourcing
4. **"Where every cup tells a story"** - Romantic and inviting

Which direction resonates with you?`,
          agentName: 'Copy Assistant',
          squadType: 'copywriting',
          timestamp: new Date(Date.now() - 60000 * 2).toISOString(),
        })}
      />
    </div>
  ),
};

export const DifferentSquads: Story = {
  render: () => (
    <div className="space-y-4">
      <MessageBubble
        message={createMessage({
          id: '1',
          role: 'agent',
          content: 'I can help you write compelling copy for your marketing materials.',
          agentName: 'Copywriter',
          squadType: 'copywriting',
        })}
      />
      <MessageBubble
        message={createMessage({
          id: '2',
          role: 'agent',
          content: 'I specialize in creating beautiful visual designs and UI mockups.',
          agentName: 'Designer',
          squadType: 'design',
        })}
      />
      <MessageBubble
        message={createMessage({
          id: '3',
          role: 'agent',
          content: 'I can generate images, videos, and other creative content.',
          agentName: 'Creator',
          squadType: 'creator',
        })}
      />
      <MessageBubble
        message={createMessage({
          id: '4',
          role: 'agent',
          content: 'I coordinate multiple agents to complete complex tasks.',
          agentName: 'Orchestrator',
          squadType: 'orchestrator',
        })}
      />
    </div>
  ),
};
