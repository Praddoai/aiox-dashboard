import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentSprite } from './AgentSprite';

const meta: Meta<typeof AgentSprite> = {
  title: 'World/AgentSprite',
  component: AgentSprite,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Pixel-art agent sprite with status indicator, tier badge, walking animation, facing direction, and hover tooltip. Used inside room views.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text', description: 'Agent display name' },
    domain: {
      control: 'select',
      options: ['content', 'sales', 'dev', 'design', 'data', 'ops'],
      description: 'Domain determines the sprite color palette',
    },
    tier: {
      control: 'select',
      options: [0, 1, 2],
      description: 'Agent tier: 0=Chief, 1=Master, 2=Specialist',
    },
    status: {
      control: 'select',
      options: ['online', 'busy', 'offline'],
      description: 'Agent availability status',
    },
    x: { control: { type: 'number', min: 0, max: 400 }, description: 'X pixel position' },
    y: { control: { type: 'number', min: 0, max: 400 }, description: 'Y pixel position' },
    selected: { control: 'boolean', description: 'Whether the agent is currently selected' },
    isChief: { control: 'boolean', description: 'Whether to show chief badge above head' },
    facing: { control: 'select', options: ['left', 'right'], description: 'Direction the sprite faces' },
    activity: {
      control: 'select',
      options: ['idle', 'walking', 'at-furniture', 'chatting'],
      description: 'Current agent activity',
    },
    activityLabel: { control: 'text', description: 'Label shown in hover tooltip' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 300,
          height: 200,
          background: '#1a1a2e',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
    name: 'Dex',
    domain: 'dev',
    tier: 2,
    status: 'online',
    x: 120,
    y: 80,
    onClick: fn(),
    onContextMenu: fn(),
  },
};

export const ChiefAgent: Story = {
  args: {
    name: 'AIOS Master',
    domain: 'ops',
    tier: 0,
    status: 'online',
    x: 120,
    y: 80,
    isChief: true,
    selected: true,
    onClick: fn(),
    onContextMenu: fn(),
  },
};

export const BusyAgent: Story = {
  args: {
    name: 'Copy Chief',
    domain: 'content',
    tier: 1,
    status: 'busy',
    x: 120,
    y: 80,
    activityLabel: 'Writing sales copy...',
    onClick: fn(),
    onContextMenu: fn(),
  },
};

export const WalkingAgent: Story = {
  args: {
    name: 'Data Analyst',
    domain: 'data',
    tier: 2,
    status: 'online',
    x: 120,
    y: 80,
    activity: 'walking',
    facing: 'left',
    onClick: fn(),
    onContextMenu: fn(),
  },
};

export const OfflineAgent: Story = {
  args: {
    name: 'Designer',
    domain: 'design',
    tier: 2,
    status: 'offline',
    x: 120,
    y: 80,
    onClick: fn(),
    onContextMenu: fn(),
  },
};

export const AllDomains: Story = {
  render: () => (
    <div style={{ position: 'relative', width: 600, height: 120 }}>
      {(['content', 'sales', 'dev', 'design', 'data', 'ops'] as const).map((domain, i) => (
        <AgentSprite
          key={domain}
          name={domain}
          domain={domain}
          tier={2}
          status="online"
          x={20 + i * 90}
          y={40}
          onClick={fn()}
        />
      ))}
    </div>
  ),
  decorators: [],
};
