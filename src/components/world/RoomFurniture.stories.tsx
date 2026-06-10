import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoomFurniture } from './RoomFurniture';
import type { FurnitureItem } from './world-layout';

const meta: Meta<typeof RoomFurniture> = {
  title: 'World/RoomFurniture',
  component: RoomFurniture,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Renders a set of pixel-art furniture SVGs positioned on a room grid. Each furniture type has a unique sprite. Z-ordering is handled by Y position, with rugs rendered behind other items.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    domain: {
      control: 'select',
      options: ['content', 'sales', 'dev', 'design', 'data', 'ops'],
      description: 'Domain determines accent color for furniture',
    },
    tileSize: { control: { type: 'number', min: 20, max: 80 }, description: 'Tile size in pixels' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 600,
          height: 400,
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

const devFurniture: FurnitureItem[] = [
  { type: 'desk', x: 1, y: 2 },
  { type: 'monitor', x: 4, y: 2 },
  { type: 'bookshelf', x: 7, y: 1 },
  { type: 'plant', x: 0, y: 3 },
  { type: 'coffee', x: 9, y: 3 },
];

const contentFurniture: FurnitureItem[] = [
  { type: 'camera', x: 1, y: 2 },
  { type: 'whiteboard', x: 4, y: 1 },
  { type: 'couch', x: 3, y: 4 },
  { type: 'lamp', x: 8, y: 2 },
  { type: 'rug', x: 2, y: 3 },
];

const opsFurniture: FurnitureItem[] = [
  { type: 'serverRack', x: 1, y: 1 },
  { type: 'printer', x: 4, y: 2 },
  { type: 'cabinet', x: 7, y: 1 },
  { type: 'waterCooler', x: 9, y: 3 },
  { type: 'meetingTable', x: 3, y: 4 },
];

export const DevFurniture: Story = {
  args: {
    items: devFurniture,
    domain: 'dev',
    tileSize: 56,
  },
};

export const ContentFurniture: Story = {
  args: {
    items: contentFurniture,
    domain: 'content',
    tileSize: 56,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 600,
          height: 400,
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

export const OpsFurniture: Story = {
  args: {
    items: opsFurniture,
    domain: 'ops',
    tileSize: 56,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 600,
          height: 400,
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
