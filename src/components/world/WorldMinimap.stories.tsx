import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WorldMinimap } from './WorldMinimap';

const meta: Meta<typeof WorldMinimap> = {
  title: 'World/WorldMinimap',
  component: WorldMinimap,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A small minimap widget that shows all rooms as colored dots in their isometric positions. The current room is highlighted with a pulsing border. Clicking a dot navigates to that room.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    currentRoomId: {
      control: 'select',
      options: [
        null,
        'full-stack-dev',
        'copywriting',
        'media-buy',
        'data-analytics',
        'orquestrador-global',
      ],
      description: 'ID of the currently selected room (highlighted on the minimap)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NoRoomSelected: Story = {
  args: {
    currentRoomId: null,
    onRoomClick: fn(),
  },
};

export const DevRoomSelected: Story = {
  args: {
    currentRoomId: 'full-stack-dev',
    onRoomClick: fn(),
  },
};

export const ContentRoomSelected: Story = {
  args: {
    currentRoomId: 'copywriting',
    onRoomClick: fn(),
  },
};

export const OpsRoomSelected: Story = {
  args: {
    currentRoomId: 'orquestrador-global',
    onRoomClick: fn(),
  },
};
