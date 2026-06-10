import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import TerminalsView from './TerminalsView';
import { useTerminalStore } from '../../stores/terminalStore';
import type { TerminalSession } from './TerminalCard';

const mockSessions: TerminalSession[] = [
  {
    id: 'term-1',
    agent: '@dev (Dex)',
    status: 'working',
    dir: '~/aios-platform/src',
    story: 'Story 2.3',
    output: [
      '$ npm run typecheck',
      '\u2713 No type errors found',
      '$ npm run lint',
      '\u2713 All files passed linting',
      '$ git commit -m "feat: add components"',
      '[feature/story-2.3 abc1234] feat: add components',
    ],
  },
  {
    id: 'term-2',
    agent: '@qa (Quinn)',
    status: 'idle',
    dir: '~/aios-platform',
    story: 'Story 2.3',
    output: [
      '$ npm run test -- --coverage',
      'PASS src/components/ui/__tests__/GlassCard.test.tsx',
      'PASS src/components/ui/__tests__/Badge.test.tsx',
      'Test Suites: 2 passed, 2 total',
      'Coverage: 87.5%',
    ],
  },
  {
    id: 'term-3',
    agent: '@sm (River)',
    status: 'idle',
    dir: '~/docs/stories',
    story: '',
    output: ['$ ls docs/stories/', '2.1.story.md  2.2.story.md  2.3.story.md'],
  },
  {
    id: 'term-4',
    agent: '@architect (Aria)',
    status: 'error',
    dir: '~/aios-platform',
    story: 'Story 2.4',
    output: [
      '$ npm run build',
      'Error: Could not resolve "./components/monitor/MetricsPanel"',
      'FAIL Build failed with 1 error',
    ],
  },
];

function TerminalsViewWithSessions() {
  useEffect(() => {
    useTerminalStore.setState({ sessions: mockSessions, activeSessionId: null });
  }, []);
  return <TerminalsView />;
}

function TerminalsViewEmpty() {
  useEffect(() => {
    useTerminalStore.setState({ sessions: [], activeSessionId: null });
  }, []);
  return <TerminalsView />;
}

function TerminalsViewWithActive() {
  useEffect(() => {
    useTerminalStore.setState({ sessions: mockSessions, activeSessionId: 'term-1' });
  }, []);
  return <TerminalsView />;
}

const meta: Meta<typeof TerminalsView> = {
  title: 'Terminals/TerminalsView',
  component: TerminalsView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main terminals management view showing a grid or list of terminal sessions with tabs, capacity indicator, and the ability to add new terminals. Clicking a session expands it to show full terminal output.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSessions: Story = {
  render: () => <TerminalsViewWithSessions />,
};

export const EmptyState: Story = {
  render: () => <TerminalsViewEmpty />,
};

export const WithActiveSession: Story = {
  render: () => <TerminalsViewWithActive />,
};
