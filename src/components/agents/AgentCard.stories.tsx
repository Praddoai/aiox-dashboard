import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentCard, AgentExplorerCard } from './AgentCard';
import type { AgentSummary } from '../../types';

const mockAgent: AgentSummary = {
  id: 'dex-dev',
  name: 'Dex',
  title: 'Senior Full-Stack Developer',
  icon: undefined,
  tier: 2,
  squad: 'full-stack-dev',
  description: 'Specialized in React, TypeScript, and Node.js development with a focus on clean architecture.',
  whenToUse: 'Use when you need to implement features, fix bugs, or refactor code in the codebase.',
  commandCount: 5,
};

const mockOrchestratorAgent: AgentSummary = {
  id: 'aios-master',
  name: 'AIOS Master',
  title: 'System Orchestrator',
  tier: 0,
  squad: 'orquestrador-global',
  description: 'The master orchestrator that coordinates all agent squads and workflows.',
  whenToUse: 'Use for framework governance and cross-agent coordination.',
  commandCount: 12,
};

const mockMasterAgent: AgentSummary = {
  id: 'morgan-pm',
  name: 'Morgan',
  title: 'Product Manager',
  tier: 1,
  squad: 'project-management-clickup',
  description: 'Drives product vision and manages the development roadmap.',
  whenToUse: 'Use for epic creation, requirements gathering, and product planning.',
  commandCount: 8,
};

const meta: Meta<typeof AgentCard> = {
  title: 'Agents/AgentCard',
  component: AgentCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card component that displays agent summary info with tier badges, favorites, and selection states. Supports compact and full layouts.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selected: {
      control: 'boolean',
      description: 'Whether the card is in selected state',
    },
    compact: {
      control: 'boolean',
      description: 'Render in compact mode (horizontal layout)',
    },
    showTier: {
      control: 'boolean',
      description: 'Show tier badge (compact mode only)',
    },
    highlight: {
      control: 'boolean',
      description: 'Highlight the card with an accent border',
    },
    onClick: {
      action: 'clicked',
      description: 'Callback when the card is clicked',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    agent: mockAgent,
    onClick: fn(),
  },
};

export const Compact: Story = {
  args: {
    agent: mockAgent,
    compact: true,
    showTier: true,
    onClick: fn(),
  },
};

export const Selected: Story = {
  args: {
    agent: mockAgent,
    selected: true,
    onClick: fn(),
  },
};

export const Highlighted: Story = {
  args: {
    agent: mockAgent,
    compact: true,
    highlight: true,
    onClick: fn(),
  },
};

export const AllTiers: Story = {
  render: () => (
    <div className="space-y-4">
      <AgentCard agent={mockOrchestratorAgent} onClick={fn()} />
      <AgentCard agent={mockMasterAgent} onClick={fn()} />
      <AgentCard agent={mockAgent} onClick={fn()} />
    </div>
  ),
};

export const ExplorerCard: StoryObj<typeof AgentExplorerCard> = {
  render: () => (
    <div className="w-80 bg-gray-900 p-4 rounded-xl">
      <AgentExplorerCard
        agent={mockAgent}
        onClick={fn()}
      />
    </div>
  ),
};

export const ExplorerCardSelected: StoryObj<typeof AgentExplorerCard> = {
  render: () => (
    <div className="w-80 bg-gray-900 p-4 rounded-xl">
      <AgentExplorerCard
        agent={mockOrchestratorAgent}
        selected
        onClick={fn()}
      />
    </div>
  ),
};
