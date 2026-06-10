import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractionLine } from './InteractionLine';

const meta: Meta<typeof InteractionLine> = {
  title: 'World/InteractionLine',
  component: InteractionLine,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An animated dashed line connecting two interacting agents. Uses SVG with a marching-ants animation to visually indicate a conversation or collaboration.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    x1: { control: { type: 'number', min: 0, max: 500 }, description: 'Start X position' },
    y1: { control: { type: 'number', min: 0, max: 500 }, description: 'Start Y position' },
    x2: { control: { type: 'number', min: 0, max: 500 }, description: 'End X position' },
    y2: { control: { type: 'number', min: 0, max: 500 }, description: 'End Y position' },
    color: { control: 'color', description: 'Line color' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 400,
          height: 300,
          background: '#0d0d1a',
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

export const Default: Story = {
  args: {
    x1: 50,
    y1: 50,
    x2: 300,
    y2: 200,
    color: '#54A0FF',
  },
};

export const ContentDomain: Story = {
  args: {
    x1: 30,
    y1: 100,
    x2: 350,
    y2: 80,
    color: '#FF6B6B',
  },
};

export const ShortDistance: Story = {
  args: {
    x1: 150,
    y1: 120,
    x2: 220,
    y2: 160,
    color: '#2ED573',
  },
};

export const Diagonal: Story = {
  args: {
    x1: 20,
    y1: 20,
    x2: 350,
    y2: 260,
    color: '#A29BFE',
  },
};
