import type { Meta, StoryObj } from '@storybook/react-vite';
import { TerminalCard, type TerminalSession } from './TerminalCard';

const workingSession: TerminalSession = {
  id: 'term-1',
  agent: '@dev (Dex)',
  status: 'working',
  dir: '~/aios-platform/src',
  story: 'Story 2.3',
  output: [
    '$ npm run typecheck',
    '',
    '> aios-platform@0.1.0 typecheck',
    '> tsc --noEmit',
    '',
    '\u2713 No type errors found',
    '',
    '$ npm run lint',
    '',
    '> aios-platform@0.1.0 lint',
    '> eslint src/ --ext .ts,.tsx',
    '',
    '\u2713 All files passed linting',
  ],
};

const idleSession: TerminalSession = {
  id: 'term-2',
  agent: '@qa (Quinn)',
  status: 'idle',
  dir: '~/aios-platform',
  story: 'Story 2.3',
  output: [
    '$ npm run test -- --coverage',
    '',
    'PASS src/components/ui/__tests__/GlassCard.test.tsx',
    'PASS src/components/ui/__tests__/Badge.test.tsx',
    '',
    'Test Suites: 2 passed, 2 total',
    'Tests:       8 passed, 8 total',
    'Coverage:    87.5%',
  ],
};

const errorSession: TerminalSession = {
  id: 'term-3',
  agent: '@architect (Aria)',
  status: 'error',
  dir: '~/aios-platform',
  story: 'Story 2.4',
  output: [
    '$ npm run build',
    '',
    'Error: Could not resolve "./components/monitor/MetricsPanel"',
    'FAIL Build failed with 1 error',
  ],
};

const noStorySession: TerminalSession = {
  id: 'term-4',
  agent: '@sm (River)',
  status: 'idle',
  dir: '~/docs/stories',
  story: '',
  output: [
    '$ ls docs/stories/',
    '2.1.story.md  2.2.story.md  2.3.story.md',
  ],
};

const meta: Meta<typeof TerminalCard> = {
  title: 'Terminals/TerminalCard',
  component: TerminalCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Card displaying a terminal session with status indicator, agent name, directory path, output lines with syntax highlighting, and story badge. Supports minimized/maximized toggle and grid/list view modes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    session: {
      control: false,
      description: 'Terminal session data including agent, status, directory, story, and output lines',
    },
    listMode: {
      control: 'boolean',
      description: 'When true, renders in compact list mode instead of fixed-height grid card',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Working: Story = {
  args: {
    session: workingSession,
  },
};

export const Idle: Story = {
  args: {
    session: idleSession,
  },
};

export const Error: Story = {
  args: {
    session: errorSession,
  },
};

export const NoStory: Story = {
  args: {
    session: noStorySession,
  },
};

export const ListMode: Story = {
  args: {
    session: workingSession,
    listMode: true,
  },
};
