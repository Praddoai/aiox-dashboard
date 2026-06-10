import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentSkills } from './AgentSkills';
import type { Agent } from '../../types';

const mockDevAgent: Agent = {
  id: 'dex-dev',
  name: 'Dex',
  title: 'Senior Full-Stack Developer',
  tier: 2,
  squad: 'full-stack-dev',
  squadType: 'engineering',
  description: 'Full-stack developer specializing in React and TypeScript.',
  executionCount: 1247,
  model: 'claude-sonnet-4',
  commands: [
    { command: 'develop', action: 'Develop', description: 'Start developing' },
    { command: 'test', action: 'Test', description: 'Run tests' },
    { command: 'refactor', action: 'Refactor', description: 'Refactor code' },
  ],
};

const mockDesignAgent: Agent = {
  id: 'brad-design',
  name: 'Brad',
  title: 'Design System Architect',
  tier: 2,
  squad: 'design-system',
  squadType: 'design',
  description: 'Expert in atomic design and component architecture.',
  executionCount: 534,
  model: 'claude-opus-4',
};

const mockCopyAgent: Agent = {
  id: 'alex-copy',
  name: 'Alex',
  title: 'Lead Copywriter',
  tier: 2,
  squad: 'copywriting',
  squadType: 'copywriting',
  description: 'Master of persuasive writing and SEO optimization.',
  executionCount: 890,
  model: 'claude-sonnet-4',
};

const mockOrchestratorAgent: Agent = {
  id: 'aios-master',
  name: 'AIOS Master',
  title: 'System Orchestrator',
  tier: 0,
  squad: 'orquestrador-global',
  squadType: 'orchestrator',
  description: 'The master orchestrator.',
  executionCount: 3200,
  model: 'claude-opus-4',
};

const meta: Meta<typeof AgentSkills> = {
  title: 'Agents/AgentSkills',
  component: AgentSkills,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Displays agent skills as animated progress bars. Skills are generated from agent frameworks, capabilities, or static squad-based definitions. Supports compact mode for inline badges.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    compact: {
      control: 'boolean',
      description: 'Render compact skill badges instead of full bars',
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

export const EngineeringSkills: Story = {
  args: {
    agent: mockDevAgent,
    compact: false,
  },
};

export const DesignSkills: Story = {
  args: {
    agent: mockDesignAgent,
    compact: false,
  },
};

export const CopywritingSkills: Story = {
  args: {
    agent: mockCopyAgent,
    compact: false,
  },
};

export const OrchestratorSkills: Story = {
  args: {
    agent: mockOrchestratorAgent,
    compact: false,
  },
};

export const Compact: Story = {
  args: {
    agent: mockDevAgent,
    compact: true,
  },
};
