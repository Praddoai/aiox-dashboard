import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SquadCard } from './SquadCard';
import type { Squad } from '../../types';

const developmentSquad: Squad = {
  id: 'full-stack-dev',
  name: 'Full Stack Dev',
  description: 'End-to-end development team handling frontend, backend, and infrastructure.',
  agentCount: 10,
  type: 'development',
  status: 'active',
  capabilities: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
};

const designSquad: Squad = {
  id: 'design-system',
  name: 'Design System',
  description: 'Design tokens, component library, and accessibility standards.',
  agentCount: 5,
  type: 'design',
  status: 'active',
  capabilities: ['Figma', 'Tokens', 'A11y', 'Storybook'],
};

const orchestratorSquad: Squad = {
  id: 'orquestrador-global',
  name: 'Global Orchestrator',
  description: 'Cross-squad coordination and workflow management.',
  agentCount: 3,
  type: 'orchestrator',
  status: 'busy',
  capabilities: ['Orchestration', 'Routing', 'Monitoring'],
};

const meta: Meta<typeof SquadCard> = {
  title: 'Squads/SquadCard',
  component: SquadCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Summary card for a squad showing name, description, capabilities, agent count, and status. Uses gradient backgrounds themed by squad type.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    squad: {
      control: false,
      description: 'Squad data object',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the card appears in a selected state',
    },
    onClick: {
      description: 'Callback when the card is clicked',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Development: Story = {
  args: {
    squad: developmentSquad,
    onClick: fn(),
  },
};

export const Design: Story = {
  args: {
    squad: designSquad,
    onClick: fn(),
  },
};

export const Orchestrator: Story = {
  args: {
    squad: orchestratorSquad,
    onClick: fn(),
  },
};

export const Selected: Story = {
  args: {
    squad: developmentSquad,
    selected: true,
    onClick: fn(),
  },
};

export const NoCaps: Story = {
  args: {
    squad: {
      id: 'basic-squad',
      name: 'Basic Squad',
      description: 'A squad with no capabilities listed.',
      agentCount: 2,
      status: 'active',
    },
    onClick: fn(),
  },
};
