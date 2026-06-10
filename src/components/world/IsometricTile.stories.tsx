import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { IsometricTile } from './IsometricTile';

const meta: Meta<typeof IsometricTile> = {
  title: 'World/IsometricTile',
  component: IsometricTile,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A single isometric diamond tile rendered at a grid position. Uses SVG for the diamond shape with optional highlighting, pulse animation, and click handling. Building block of the world map.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    col: { control: { type: 'number', min: 0, max: 10 }, description: 'Grid column' },
    row: { control: { type: 'number', min: 0, max: 10 }, description: 'Grid row' },
    color: { control: 'color', description: 'Fill color of the tile' },
    borderColor: { control: 'color', description: 'Stroke color of the tile' },
    highlighted: { control: 'boolean', description: 'Whether the tile is highlighted (hovered)' },
    pulse: { control: 'boolean', description: 'Whether the tile has a pulse animation (active rooms)' },
    offsetX: { control: 'number', description: 'Pixel offset X for centering' },
    offsetY: { control: 'number', description: 'Pixel offset Y for centering' },
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
    col: 1,
    row: 1,
    color: '#54A0FF',
    borderColor: '#3D8AE8',
    offsetX: 100,
    offsetY: 80,
    onClick: fn(),
  },
};

export const Highlighted: Story = {
  args: {
    col: 1,
    row: 1,
    color: '#FF6B6B',
    borderColor: '#E05555',
    highlighted: true,
    offsetX: 100,
    offsetY: 80,
    onClick: fn(),
  },
};

export const Pulsing: Story = {
  args: {
    col: 1,
    row: 1,
    color: '#2ED573',
    borderColor: '#22C05E',
    pulse: true,
    offsetX: 100,
    offsetY: 80,
    onClick: fn(),
  },
};

export const WithContent: Story = {
  args: {
    col: 1,
    row: 1,
    color: '#A29BFE',
    borderColor: '#8B84E8',
    pulse: true,
    offsetX: 100,
    offsetY: 80,
    onClick: fn(),
    children: (
      <span style={{ fontSize: 10, color: 'white', fontFamily: 'monospace' }}>DEV</span>
    ),
  },
};

export const GridOfTiles: Story = {
  render: () => {
    const colors = ['#FF6B6B', '#FF9F43', '#54A0FF', '#FF6B81', '#A29BFE', '#2ED573'];
    return (
      <div style={{ position: 'relative', width: 500, height: 300 }}>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <IsometricTile
              key={`${row}-${col}`}
              col={col}
              row={row}
              color={colors[(row * 3 + col) % colors.length]}
              offsetX={200}
              offsetY={40}
              onClick={fn()}
            />
          ))
        )}
      </div>
    );
  },
  decorators: [],
};
