import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentEmotes, FloatingEmote } from './AgentEmotes';

const meta: Meta<typeof AgentEmotes> = {
  title: 'World/AgentEmotes',
  component: AgentEmotes,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A radial emote ring that appears around an agent, allowing users to select an emotion. Includes a floating animation on selection.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    x: { control: { type: 'number', min: 0, max: 600 }, description: 'X position (center of ring)' },
    y: { control: { type: 'number', min: 0, max: 600 }, description: 'Y position (center of ring)' },
    onEmote: { description: 'Called with the emote key when an emote is selected' },
    onClose: { description: 'Called when the ring is dismissed' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 300,
          height: 300,
          background: '#1a1a2e',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    x: 150,
    y: 150,
    onEmote: fn(),
    onClose: fn(),
  },
};

export const TopLeftPosition: Story = {
  args: {
    x: 80,
    y: 80,
    onEmote: fn(),
    onClose: fn(),
  },
};

export const BottomRightPosition: Story = {
  args: {
    x: 220,
    y: 220,
    onEmote: fn(),
    onClose: fn(),
  },
};

const FloatingEmoteMeta: Meta<typeof FloatingEmote> = {
  title: 'World/FloatingEmote',
  component: FloatingEmote,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A small floating emote animation that rises and fades after an emote is selected.',
      },
    },
  },
  tags: ['autodocs'],
};

export const FloatingWave: StoryObj<typeof FloatingEmote> = {
  render: () => (
    <div
      style={{
        position: 'relative',
        width: 200,
        height: 200,
        background: '#1a1a2e',
        borderRadius: 12,
      }}
    >
      <FloatingEmote emoteKey="wave" x={100} y={120} />
    </div>
  ),
  ...FloatingEmoteMeta,
};

export const FloatingLove: StoryObj<typeof FloatingEmote> = {
  render: () => (
    <div
      style={{
        position: 'relative',
        width: 200,
        height: 200,
        background: '#1a1a2e',
        borderRadius: 12,
      }}
    >
      <FloatingEmote emoteKey="love" x={100} y={120} />
    </div>
  ),
};
