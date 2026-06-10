import type { Meta, StoryObj } from '@storybook/react-vite';
import { AmbientParticles } from './AmbientParticles';

const meta: Meta<typeof AmbientParticles> = {
  title: 'World/AmbientParticles',
  component: AmbientParticles,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Ambient floating particles that drift within a room. Each domain has unique character symbols (e.g. </> for dev, $ for sales) that animate with domain-themed colors.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    domain: {
      control: 'select',
      options: ['content', 'sales', 'dev', 'design', 'data', 'ops'],
      description: 'Domain determines particle characters and color',
    },
    roomWidth: { control: { type: 'number', min: 200, max: 1200 }, description: 'Room width in pixels' },
    roomHeight: { control: { type: 'number', min: 200, max: 800 }, description: 'Room height in pixels' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 500,
          height: 350,
          background: '#0d0d1a',
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

export const DevParticles: Story = {
  args: {
    domain: 'dev',
    roomWidth: 500,
    roomHeight: 350,
  },
};

export const ContentParticles: Story = {
  args: {
    domain: 'content',
    roomWidth: 500,
    roomHeight: 350,
  },
};

export const SalesParticles: Story = {
  args: {
    domain: 'sales',
    roomWidth: 500,
    roomHeight: 350,
  },
};

export const DataParticles: Story = {
  args: {
    domain: 'data',
    roomWidth: 500,
    roomHeight: 350,
  },
};

export const OpsParticles: Story = {
  args: {
    domain: 'ops',
    roomWidth: 500,
    roomHeight: 350,
  },
};
