import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentProfileExpanded } from './AgentProfileExpanded';
import type { Agent } from '../../types';

const mockFullAgent: Agent = {
  id: 'dex-dev',
  name: 'Dex',
  title: 'Senior Full-Stack Developer',
  tier: 2,
  squad: 'full-stack-dev',
  description: 'Specialized in React, TypeScript, and Node.js development with a focus on clean architecture and test-driven development.',
  whenToUse: 'Use when you need to implement features, fix bugs, refactor code, or write tests for the codebase.',
  persona: {
    role: 'Senior Full-Stack Developer',
    style: 'Pragmatic, detail-oriented, and methodical',
    identity: 'A seasoned developer who values clean code and solid testing practices',
    background: 'Years of experience building scalable web applications with modern tech stacks.',
    focus: 'Code quality, architecture patterns, and developer experience',
  },
  corePrinciples: [
    'Write clean, self-documenting code',
    'Test-driven development when possible',
    'Follow SOLID principles',
    'Keep functions small and focused',
    'Prefer composition over inheritance',
  ],
  commands: [
    { command: 'develop', action: 'Start development', description: 'Begin implementing a story or task' },
    { command: 'refactor', action: 'Refactor code', description: 'Improve code structure without changing behavior' },
    { command: 'test', action: 'Write tests', description: 'Create unit and integration tests' },
    { command: 'review', action: 'Code review', description: 'Review code changes and suggest improvements' },
  ],
  mindSource: {
    name: 'Martin Fowler, Kent Beck',
    credentials: ['Clean Code', 'TDD Expert'],
    frameworks: ['React', 'TypeScript', 'Vitest', 'Zustand'],
  },
  voiceDna: {
    sentenceStarters: ['Let me analyze', 'The best approach here', 'Based on the codebase'],
    vocabulary: {
      alwaysUse: ['refactor', 'pattern', 'architecture', 'clean code'],
      neverUse: ['hack', 'quick fix', 'workaround'],
    },
  },
  antiPatterns: {
    neverDo: [
      'Skip writing tests for new features',
      'Use any type in TypeScript',
      'Commit directly to main branch',
      'Ignore linting errors',
    ],
  },
  integration: {
    receivesFrom: ['@architect', '@pm'],
    handoffTo: ['@qa', '@devops'],
  },
};

const mockMinimalAgent: Agent = {
  id: 'helper-1',
  name: 'Helper',
  title: 'General Assistant',
  tier: 2,
  squad: 'default',
  description: 'A general purpose assistant agent.',
};

const meta: Meta<typeof AgentProfileExpanded> = {
  title: 'Agents/AgentProfileExpanded',
  component: AgentProfileExpanded,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Expanded agent profile modal with tabbed navigation (Overview, Commands, Persona). Shows detailed info including principles, mind source, voice DNA, anti-patterns, and integration details.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the expanded profile modal is visible',
    },
    onClose: {
      action: 'closed',
      description: 'Callback when the modal is closed',
    },
    onStartChat: {
      action: 'start-chat',
      description: 'Callback when the user wants to start a chat',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FullProfile: Story = {
  args: {
    agent: mockFullAgent,
    isOpen: true,
    onClose: fn(),
    onStartChat: fn(),
  },
};

export const MinimalProfile: Story = {
  args: {
    agent: mockMinimalAgent,
    isOpen: true,
    onClose: fn(),
    onStartChat: fn(),
  },
};

export const Closed: Story = {
  args: {
    agent: mockFullAgent,
    isOpen: false,
    onClose: fn(),
    onStartChat: fn(),
  },
};
