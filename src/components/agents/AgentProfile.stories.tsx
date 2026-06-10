import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentProfile } from './AgentProfile';
import type { Agent } from '../../types';

const mockAgent: Agent = {
  id: 'dex-dev',
  name: 'Dex',
  title: 'Senior Full-Stack Developer',
  tier: 2,
  squad: 'full-stack-dev',
  squadType: 'engineering',
  role: 'Full-Stack Developer',
  description: 'Dex is a senior full-stack developer specializing in React, TypeScript, and Node.js. He follows clean architecture principles and writes well-tested, maintainable code.',
  status: 'online',
  capabilities: ['React', 'TypeScript', 'Node.js', 'Testing', 'Architecture'],
  model: 'claude-sonnet-4',
  lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  executionCount: 1247,
};

const mockOfflineAgent: Agent = {
  id: 'aria-architect',
  name: 'Aria',
  title: 'System Architect',
  tier: 1,
  squad: 'aios-core-dev',
  squadType: 'engineering',
  role: 'Architect',
  description: 'Aria designs the system architecture, makes technology decisions, and ensures scalable, maintainable patterns across the codebase.',
  status: 'offline',
  capabilities: ['System Design', 'Database', 'API Design', 'Performance'],
  model: 'claude-opus-4',
  executionCount: 534,
};

const mockBusyAgent: Agent = {
  id: 'morgan-pm',
  name: 'Morgan',
  title: 'Product Manager',
  tier: 1,
  squad: 'project-management-clickup',
  squadType: 'orchestrator',
  role: 'Product Manager',
  description: 'Morgan drives product vision, manages epics, gathers requirements, and coordinates the development roadmap.',
  status: 'busy',
  capabilities: ['Epic Management', 'Requirements', 'Roadmap', 'Stakeholder Communication'],
  model: 'claude-sonnet-4',
  lastActive: new Date(Date.now() - 30 * 1000).toISOString(),
  executionCount: 892,
};

const meta: Meta<typeof AgentProfile> = {
  title: 'Agents/AgentProfile',
  component: AgentProfile,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Agent profile card showing avatar, role, status, stats, capabilities, and a call-to-action button. Used for detailed agent information display.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onStartChat: {
      action: 'start-chat',
      description: 'Callback to initiate a chat session with the agent',
    },
    onClose: {
      action: 'closed',
      description: 'Callback to close the profile view',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[420px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Online: Story = {
  args: {
    agent: mockAgent,
    onStartChat: fn(),
    onClose: fn(),
  },
};

export const Offline: Story = {
  args: {
    agent: mockOfflineAgent,
    onStartChat: fn(),
    onClose: fn(),
  },
};

export const Busy: Story = {
  args: {
    agent: mockBusyAgent,
    onStartChat: fn(),
    onClose: fn(),
  },
};

export const WithoutCloseButton: Story = {
  args: {
    agent: mockAgent,
    onStartChat: fn(),
  },
};

export const WithoutActions: Story = {
  args: {
    agent: mockAgent,
  },
};
