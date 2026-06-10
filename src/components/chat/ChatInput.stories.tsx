import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ChatInput } from './ChatInput';

const meta: Meta<typeof ChatInput> = {
  title: 'Chat/ChatInput',
  component: ChatInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Chat input component with send, stop, attachment, and voice buttons.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disables the input',
    },
    isStreaming: {
      control: 'boolean',
      description: 'Shows stop button instead of send',
    },
    agentName: {
      control: 'text',
      description: 'Agent name for placeholder',
    },
    placeholder: {
      control: 'text',
      description: 'Custom placeholder text',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSend: fn(),
  },
};

export const WithAgentName: Story = {
  args: {
    onSend: fn(),
    agentName: 'Copy Assistant',
  },
};

export const CustomPlaceholder: Story = {
  args: {
    onSend: fn(),
    placeholder: 'Ask me anything about marketing...',
  },
};

export const Streaming: Story = {
  args: {
    onSend: fn(),
    onStop: fn(),
    isStreaming: true,
  },
};

export const Disabled: Story = {
  args: {
    onSend: fn(),
    disabled: true,
  },
};

export const WithAttachments: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Click the attachment button to add files (functionality simulated)
      </p>
      <ChatInput onSend={fn()} />
    </div>
  ),
};

export const InChatContext: Story = {
  render: () => (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
            Can you help me write a product description?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="glass rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
            Of course! I'd be happy to help. What product would you like me to describe?
          </div>
        </div>
      </div>
      <ChatInput
        onSend={fn()}
        agentName="Copy Assistant"
      />
    </div>
  ),
};

export const StreamingWithMessage: Story = {
  render: () => (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
            Write a tagline for an eco-friendly water bottle
          </div>
        </div>
        <div className="flex justify-start">
          <div className="glass rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
            <span className="typing-indicator">
              <span></span><span></span><span></span>
            </span>
          </div>
        </div>
      </div>
      <ChatInput
        onSend={fn()}
        onStop={fn()}
        isStreaming={true}
      />
    </div>
  ),
};
