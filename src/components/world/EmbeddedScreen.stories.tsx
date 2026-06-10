import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmbeddedScreen } from './EmbeddedScreen';

const meta: Meta<typeof EmbeddedScreen> = {
  title: 'World/EmbeddedScreen',
  component: EmbeddedScreen,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An animated embedded screen placed on furniture (monitors and projectors). Each domain renders unique animated content: scrolling code for dev, bar charts for data, play buttons for content, dashboards for sales, color palettes for design, and terminal output for ops.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    domain: {
      control: 'select',
      options: ['content', 'sales', 'dev', 'design', 'data', 'ops'],
      description: 'Domain determines the screen animation content',
    },
    type: {
      control: 'select',
      options: ['monitor', 'projectorScreen'],
      description: 'Screen type affects size',
    },
    x: { control: { type: 'number', min: 0, max: 20 }, description: 'Tile X position' },
    y: { control: { type: 'number', min: 0, max: 14 }, description: 'Tile Y position' },
    tileSize: { control: { type: 'number', min: 20, max: 80 }, description: 'Size of a tile in pixels' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 200,
          height: 150,
          background: '#0d0d1a',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DevMonitor: Story = {
  args: {
    domain: 'dev',
    type: 'monitor',
    x: 1,
    y: 1,
    tileSize: 56,
  },
};

export const DataProjector: Story = {
  args: {
    domain: 'data',
    type: 'projectorScreen',
    x: 1,
    y: 1,
    tileSize: 56,
  },
};

export const ContentMonitor: Story = {
  args: {
    domain: 'content',
    type: 'monitor',
    x: 1,
    y: 1,
    tileSize: 56,
  },
};

export const SalesMonitor: Story = {
  args: {
    domain: 'sales',
    type: 'monitor',
    x: 1,
    y: 1,
    tileSize: 56,
  },
};

export const DesignProjector: Story = {
  args: {
    domain: 'design',
    type: 'projectorScreen',
    x: 1,
    y: 1,
    tileSize: 56,
  },
};

export const OpsMonitor: Story = {
  args: {
    domain: 'ops',
    type: 'monitor',
    x: 1,
    y: 1,
    tileSize: 56,
  },
};
