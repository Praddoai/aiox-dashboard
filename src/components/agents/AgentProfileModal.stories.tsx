import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AgentProfileModal } from './AgentProfileModal';

const mockAgent = {
  id: 'dex-dev',
  name: 'Dex',
  title: 'Senior Full-Stack Developer',
  icon: undefined,
  tier: 2 as const,
  squad: 'full-stack-dev',
  whenToUse: 'Use when you need to implement features, fix bugs, refactor code, or write tests.',
  commandCount: 4,
  commands: [
    { command: '*develop', description: 'Begin implementing a story or task' },
    { command: '*refactor', description: 'Improve code structure without changing behavior' },
    { command: '*test', description: 'Create unit and integration tests' },
    { command: '*review', description: 'Review code changes and suggest improvements' },
  ],
  persona: {
    role: 'Senior Full-Stack Developer',
    style: 'Pragmatic, detail-oriented, and methodical',
    focus: 'Code quality, architecture patterns, and developer experience',
    identity: 'A seasoned developer who values clean code',
    background: 'Years of experience in modern web stacks with React, TypeScript, and Node.js.',
  },
  corePrinciples: [
    'Write clean, self-documenting code',
    'Test-driven development when possible',
    'Follow SOLID principles',
    'Keep functions small and focused',
  ],
  frameworks: ['React', 'TypeScript', 'Vitest', 'Zustand', 'Tailwind CSS'],
  hasVoiceDna: true,
  hasAntiPatterns: true,
  hasIntegration: true,
  config: {
    anti_patterns: {
      never_do: [
        'Skip writing tests for new features',
        'Use any type in TypeScript',
        'Commit directly to main branch',
      ],
    },
    voice_dna: {
      sentence_starters: [
        'Let me analyze',
        'The best approach here',
        'Based on the codebase',
        'I recommend',
      ],
      vocabulary: {
        always_use: ['refactor', 'pattern', 'architecture', 'clean code'],
        never_use: ['hack', 'quick fix', 'workaround'],
      },
    },
    integration: {
      receives_from: ['@architect', '@pm', '@po'],
      handoff_to: ['@qa', '@devops'],
    },
  },
};

const mockOrchestratorAgent = {
  id: 'aios-master',
  name: 'AIOS Master',
  title: 'System Orchestrator',
  tier: 0 as const,
  squad: 'orquestrador-global',
  whenToUse: 'Use for framework governance, cross-agent coordination, and system-level operations.',
  commandCount: 12,
  commands: [
    { command: '*help', description: 'Show available commands' },
    { command: '*create-story', description: 'Create a new development story' },
    { command: '*task', description: 'Execute a specific task' },
    { command: '*workflow', description: 'Run a multi-step workflow' },
  ],
  persona: {
    role: 'Meta-Framework Orchestrator',
    style: 'Authoritative, systematic, precise',
    focus: 'System governance and agent coordination',
  },
  corePrinciples: [
    'Constitutional enforcement above all',
    'Task-first, agent-second',
    'Respect agent boundaries',
  ],
  frameworks: ['AIOS Framework', 'Constitutional AI', 'Agent Orchestration'],
  hasVoiceDna: false,
  hasAntiPatterns: false,
  hasIntegration: false,
};

const mockMinimalAgent = {
  id: 'basic-agent',
  name: 'Basic Agent',
  title: 'General Assistant',
  tier: 2 as const,
  squad: 'default',
  commandCount: 0,
  hasVoiceDna: false,
  hasAntiPatterns: false,
  hasIntegration: false,
};

const meta: Meta<typeof AgentProfileModal> = {
  title: 'Agents/AgentProfileModal',
  component: AgentProfileModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Accessible modal dialog showing detailed agent profile with tabbed navigation (Overview, Commands, Voice & Style, Integrations). Includes focus trap and keyboard navigation.',
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
      description: 'Whether the modal is visible',
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
    agent: mockAgent,
    isOpen: true,
    onClose: fn(),
    onStartChat: fn(),
  },
};

export const Orchestrator: Story = {
  args: {
    agent: mockOrchestratorAgent,
    isOpen: true,
    onClose: fn(),
    onStartChat: fn(),
  },
};

export const MinimalAgent: Story = {
  args: {
    agent: mockMinimalAgent,
    isOpen: true,
    onClose: fn(),
    onStartChat: fn(),
  },
};

export const Closed: Story = {
  args: {
    agent: mockAgent,
    isOpen: false,
    onClose: fn(),
    onStartChat: fn(),
  },
};

export const NoAgent: Story = {
  args: {
    agent: null,
    isOpen: true,
    onClose: fn(),
    onStartChat: fn(),
  },
};
