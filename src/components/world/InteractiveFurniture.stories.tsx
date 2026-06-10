import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractiveFurniture } from './InteractiveFurniture';
import type { FurnitureItem } from './world-layout';

const meta: Meta<typeof InteractiveFurniture> = {
  title: 'World/InteractiveFurniture',
  component: InteractiveFurniture,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Interactive hover zone for furniture items in a room. Displays a tooltip with the furniture name and description on hover. Non-interactive items (rug, lamp, plant) render nothing.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    domain: {
      control: 'select',
      options: ['content', 'sales', 'dev', 'design', 'data', 'ops'],
      description: 'Domain determines accent color for hover highlight',
    },
    tileSize: { control: { type: 'number', min: 20, max: 80 }, description: 'Tile size in pixels' },
    index: { control: 'number', description: 'Index for key generation' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 300,
          height: 250,
          background: '#1a1a2e',
          borderRadius: 12,
          padding: 40,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const deskItem: FurnitureItem = { type: 'desk', x: 1, y: 1 };
const monitorItem: FurnitureItem = { type: 'monitor', x: 1, y: 1 };
const whiteboardItem: FurnitureItem = { type: 'whiteboard', x: 1, y: 1 };
const serverRackItem: FurnitureItem = { type: 'serverRack', x: 1, y: 1 };
const coffeeItem: FurnitureItem = { type: 'coffee', x: 1, y: 1 };

export const Desk: Story = {
  args: {
    item: deskItem,
    domain: 'dev',
    tileSize: 56,
    index: 0,
  },
};

export const Monitor: Story = {
  args: {
    item: monitorItem,
    domain: 'data',
    tileSize: 56,
    index: 1,
  },
};

export const Whiteboard: Story = {
  args: {
    item: whiteboardItem,
    domain: 'content',
    tileSize: 56,
    index: 2,
  },
};

export const ServerRack: Story = {
  args: {
    item: serverRackItem,
    domain: 'ops',
    tileSize: 56,
    index: 3,
  },
};

export const CoffeeMachine: Story = {
  args: {
    item: coffeeItem,
    domain: 'design',
    tileSize: 56,
    index: 4,
  },
};
