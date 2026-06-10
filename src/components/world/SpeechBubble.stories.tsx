import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpeechBubble } from './SpeechBubble';

const meta: Meta<typeof SpeechBubble> = {
  title: 'World/SpeechBubble',
  component: SpeechBubble,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A small pixel-art speech bubble that appears above an agent sprite. Displays an icon based on the content type: thinking dots, eureka mark, code brackets, money sign, chart bars, or chat tilde.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'select',
      options: ['thinking', 'eureka', 'code', 'money', 'chart', 'chat'],
      description: 'Type of content icon displayed in the bubble',
    },
    x: { control: { type: 'number', min: 0, max: 400 }, description: 'X pixel position' },
    y: { control: { type: 'number', min: 0, max: 400 }, description: 'Y pixel position' },
    color: { control: 'color', description: 'Icon color inside the bubble' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 200,
          height: 150,
          background: '#1a1a2e',
          borderRadius: 12,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Thinking: Story = {
  args: {
    content: 'thinking',
    x: 80,
    y: 80,
    color: '#54A0FF',
  },
};

export const Eureka: Story = {
  args: {
    content: 'eureka',
    x: 80,
    y: 80,
    color: '#FFD93D',
  },
};

export const Code: Story = {
  args: {
    content: 'code',
    x: 80,
    y: 80,
    color: '#54A0FF',
  },
};

export const Money: Story = {
  args: {
    content: 'money',
    x: 80,
    y: 80,
    color: '#FF9F43',
  },
};

export const Chart: Story = {
  args: {
    content: 'chart',
    x: 80,
    y: 80,
    color: '#A29BFE',
  },
};

export const AllBubbles: Story = {
  render: () => (
    <div style={{ position: 'relative', width: 500, height: 100 }}>
      {(['thinking', 'eureka', 'code', 'money', 'chart', 'chat'] as const).map((content, i) => (
        <SpeechBubble
          key={content}
          content={content}
          x={30 + i * 75}
          y={60}
          color="#fff"
        />
      ))}
    </div>
  ),
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 520,
          height: 120,
          background: '#1a1a2e',
          borderRadius: 12,
        }}
      >
        <Story />
      </div>
    ),
  ],
};
