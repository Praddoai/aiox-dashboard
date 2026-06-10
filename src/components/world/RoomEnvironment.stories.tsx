import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoomEnvironment } from './RoomEnvironment';

const meta: Meta<typeof RoomEnvironment> = {
  title: 'World/RoomEnvironment',
  component: RoomEnvironment,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Room environment rendering including walls with brick patterns, windows with glass gradients, a wall clock, domain plaque, and baseboard trim. Creates the background atmosphere for room views.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    domain: {
      control: 'select',
      options: ['content', 'sales', 'dev', 'design', 'data', 'ops'],
      description: 'Domain determines wall color and plaque label',
    },
    tileSize: { control: { type: 'number', min: 20, max: 80 }, description: 'Tile size in pixels' },
    roomWidth: { control: { type: 'number', min: 400, max: 1200 }, description: 'Total room width in pixels' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 800,
          height: 200,
          background: '#EBF3FF',
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

export const DevRoom: Story = {
  args: {
    domain: 'dev',
    tileSize: 56,
    roomWidth: 800,
  },
};

export const ContentRoom: Story = {
  args: {
    domain: 'content',
    tileSize: 56,
    roomWidth: 800,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 800,
          height: 200,
          background: '#FFF0F0',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const OpsRoom: Story = {
  args: {
    domain: 'ops',
    tileSize: 56,
    roomWidth: 800,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 800,
          height: 200,
          background: '#EDFFF3',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const NarrowRoom: Story = {
  args: {
    domain: 'design',
    tileSize: 56,
    roomWidth: 500,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 500,
          height: 200,
          background: '#FFF0F3',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
