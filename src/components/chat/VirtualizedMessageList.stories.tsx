import type { Meta, StoryObj } from '@storybook/react-vite';
import { SmartMessageList } from './VirtualizedMessageList';
import type { Message } from '../../types';

// Helper to create mock messages
const createMessage = (overrides: Partial<Message> & { id: string }): Message => ({
  role: 'user',
  content: 'Sample message',
  timestamp: new Date().toISOString(),
  ...overrides,
});

const fewMessages: Message[] = [
  createMessage({
    id: '1',
    role: 'user',
    content: 'Can you help me create a marketing strategy?',
    timestamp: new Date(Date.now() - 300000).toISOString(),
  }),
  createMessage({
    id: '2',
    role: 'agent',
    content:
      "Absolutely! I'd be happy to help you build a comprehensive marketing strategy. Let's start with a few questions:\n\n1. What is your product or service?\n2. Who is your target audience?\n3. What is your budget range?",
    agentName: 'Marketing Agent',
    squadType: 'copywriting',
    timestamp: new Date(Date.now() - 240000).toISOString(),
  }),
  createMessage({
    id: '3',
    role: 'user',
    content:
      "We're building an AI-powered productivity app for remote workers. Target audience is 25-45 year olds. Budget is $10k.",
    timestamp: new Date(Date.now() - 180000).toISOString(),
  }),
  createMessage({
    id: '4',
    role: 'agent',
    content:
      "Great! Here's my initial recommendation:\n\n## Channel Mix\n- **Content Marketing** (40% of budget)\n- **Social Media Ads** (35%)\n- **Email Marketing** (25%)\n\nShall I elaborate on any of these channels?",
    agentName: 'Marketing Agent',
    squadType: 'copywriting',
    timestamp: new Date(Date.now() - 120000).toISOString(),
  }),
];

// Generate a large list for virtualization testing
const manyMessages: Message[] = Array.from({ length: 80 }, (_, i) => {
  const isUser = i % 2 === 0;
  return createMessage({
    id: `msg-${i}`,
    role: isUser ? 'user' : 'agent',
    content: isUser
      ? `User message #${Math.floor(i / 2) + 1}: What about the next step?`
      : `Agent response #${Math.floor(i / 2) + 1}: Here is a detailed explanation of the next steps you should take for your project. This covers planning, execution, and review phases.`,
    agentName: isUser ? undefined : 'Assistant',
    squadType: isUser ? undefined : 'orchestrator',
    timestamp: new Date(Date.now() - (80 - i) * 60000).toISOString(),
  });
});

const meta: Meta<typeof SmartMessageList> = {
  title: 'Chat/VirtualizedMessageList',
  component: SmartMessageList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Smart message list that switches between a simple animated list and a virtualized list based on message count. Uses @tanstack/react-virtual for large datasets (50+ messages).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    messages: {
      description: 'Array of Message objects to render',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    virtualizationThreshold: {
      control: { type: 'number', min: 10, max: 200 },
      description: 'Number of messages before switching to virtualized rendering',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto" style={{ height: '500px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FewMessages: Story = {
  args: {
    messages: fewMessages,
    virtualizationThreshold: 50,
  },
};

export const SingleMessage: Story = {
  args: {
    messages: [
      createMessage({
        id: '1',
        role: 'user',
        content: 'Hello, can you help me?',
      }),
    ],
    virtualizationThreshold: 50,
  },
};

export const EmptyList: Story = {
  args: {
    messages: [],
    virtualizationThreshold: 50,
  },
};

export const ManyMessages: Story = {
  name: 'Many Messages (virtualized)',
  args: {
    messages: manyMessages,
    virtualizationThreshold: 50,
  },
};

export const LowThreshold: Story = {
  name: 'Low Threshold (virtualized at 3+)',
  args: {
    messages: fewMessages,
    virtualizationThreshold: 3,
  },
};
