import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentDetailPanel } from './AgentDetailPanel';
import type { Agent } from '../../types';

const fullAgent: Agent = {
  id: 'dex',
  name: 'Dex',
  title: 'Senior Full-Stack Developer',
  tier: 2,
  squad: 'full-stack-dev',
  description:
    'Expert developer agent specialized in TypeScript, React, and Node.js. Handles implementation tasks with clean code practices and comprehensive testing.',
  status: 'online',
  model: 'claude-opus-4',
  lastActive: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  executionCount: 247,
  persona: {
    role: 'Senior Developer',
    style: 'Pragmatic, test-driven, detail-oriented',
    identity: 'A meticulous craftsman who values clean architecture and comprehensive tests.',
  },
  corePrinciples: [
    'Write self-documenting code with clear naming',
    'Test all edge cases before marking complete',
    'Follow existing patterns in the codebase',
    'Keep functions focused and under 30 lines',
    'Handle errors explicitly, never silently fail',
  ],
  commands: [
    { command: '*develop', action: 'Implement a story', description: 'Full implementation workflow with tests' },
    { command: '*fix', action: 'Fix a bug', description: 'Diagnose and fix an issue with regression test' },
    { command: '*refactor', action: 'Refactor code', description: 'Improve code quality while preserving behavior' },
    { command: '*test', action: 'Write tests', description: 'Create unit and integration tests' },
  ],
  voiceDna: {
    sentenceStarters: ['Looking at the code...', 'Based on the existing pattern...', 'I recommend we...'],
    vocabulary: {
      alwaysUse: ['clean', 'testable', 'maintainable', 'type-safe', 'modular'],
      neverUse: ['just', 'simply', 'obviously', 'trivial'],
    },
  },
  antiPatterns: {
    neverDo: [
      'Commit code without running tests',
      'Skip error handling for convenience',
      'Use any type in TypeScript',
      'Create god components with 500+ lines',
    ],
  },
  integration: {
    receivesFrom: ['@architect', '@sm', '@pm'],
    handoffTo: ['@qa', '@devops'],
  },
  quality: {
    hasVoiceDna: true,
    hasAntiPatterns: true,
    hasIntegration: true,
  },
};

const minimalAgent: Agent = {
  id: 'agent-min',
  name: 'Assistant',
  tier: 2,
  squad: 'general',
  title: 'General Assistant',
  status: 'offline',
};

const orchestratorAgent: Agent = {
  id: 'bob',
  name: 'Bob',
  title: 'Global Orchestrator',
  tier: 0,
  squad: 'orquestrador-global',
  description: 'Master orchestrator that coordinates all squads and manages cross-squad workflows.',
  status: 'busy',
  model: 'claude-opus-4',
  lastActive: new Date().toISOString(),
  executionCount: 1024,
  persona: {
    role: 'Orchestrator',
    style: 'Decisive, strategic, high-level',
    identity: 'The conductor of the AI orchestra.',
  },
  corePrinciples: [
    'Delegate to the right specialist',
    'Never do what a specialist can do better',
    'Maintain global context across squads',
  ],
  commands: [
    { command: '*orchestrate', action: 'Orchestrate workflow', description: 'Multi-agent workflow orchestration' },
    { command: '*status', action: 'System status', description: 'Overview of all squads and agents' },
  ],
  quality: {
    hasVoiceDna: false,
    hasAntiPatterns: false,
    hasIntegration: true,
  },
  integration: {
    receivesFrom: ['@pm', '@architect'],
    handoffTo: ['@dev', '@qa', '@devops', '@sm'],
  },
};

const meta: Meta<typeof AgentDetailPanel> = {
  title: 'Squads/AgentDetailPanel',
  component: AgentDetailPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Detailed panel showing comprehensive agent information including profile, persona, core principles, commands, voice DNA, anti-patterns, integration map, and quality indicators.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    agent: {
      control: false,
      description: 'Full agent data object',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360, height: 600, position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FullProfile: Story = {
  args: {
    agent: fullAgent,
  },
};

export const Orchestrator: Story = {
  args: {
    agent: orchestratorAgent,
  },
};

export const MinimalProfile: Story = {
  args: {
    agent: minimalAgent,
  },
};
