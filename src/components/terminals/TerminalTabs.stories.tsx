import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TerminalTabs } from './TerminalTabs';
import type { TerminalSession } from './TerminalCard';

const mockSessions: TerminalSession[] = [
  { id: 't-1', agent: '@dev (Dex)', status: 'working', dir: '~/src', story: 'Story 2.3', output: [] },
  { id: 't-2', agent: '@qa (Quinn)', status: 'idle', dir: '~/test', story: 'Story 2.3', output: [] },
  { id: 't-3', agent: '@sm (River)', status: 'idle', dir: '~/docs', story: '', output: [] },
  { id: 't-4', agent: '@architect (Aria)', status: 'error', dir: '~/src', story: 'Story 2.4', output: [] },
];

const meta: Meta<typeof TerminalTabs> = {
  title: 'Terminals/TerminalTabs',
  component: TerminalTabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Horizontal tab bar for terminal sessions with status dots, agent names, and close buttons. Each tab shows the session status (working/idle/error) via a StatusDot component.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    sessions: {
      control: false,
      description: 'Array of terminal sessions to display as tabs',
    },
    activeId: {
      control: 'text',
      description: 'ID of the currently selected/active session',
    },
    onSelect: {
      control: false,
      description: 'Callback fired when a tab is clicked',
    },
    onClose: {
      control: false,
      description: 'Callback fired when a tab close button is clicked',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sessions: mockSessions,
    activeId: 't-1',
    onSelect: fn(),
    onClose: fn(),
  },
};

export const NoActiveTab: Story = {
  args: {
    sessions: mockSessions,
    activeId: null,
    onSelect: fn(),
    onClose: fn(),
  },
};

export const SingleTab: Story = {
  args: {
    sessions: [mockSessions[0]],
    activeId: 't-1',
    onSelect: fn(),
    onClose: fn(),
  },
};

export const Empty: Story = {
  args: {
    sessions: [],
    activeId: null,
    onSelect: fn(),
    onClose: fn(),
  },
};

export const ManyTabs: Story = {
  args: {
    sessions: [
      ...mockSessions,
      { id: 't-5', agent: '@pm (Morgan)', status: 'idle' as const, dir: '~/pm', story: '', output: [] },
      { id: 't-6', agent: '@devops (Gage)', status: 'working' as const, dir: '~/ops', story: 'Story 3.1', output: [] },
      { id: 't-7', agent: '@po (Pax)', status: 'idle' as const, dir: '~/po', story: '', output: [] },
      { id: 't-8', agent: '@analyst (Nova)', status: 'idle' as const, dir: '~/data', story: '', output: [] },
    ],
    activeId: 't-6',
    onSelect: fn(),
    onClose: fn(),
  },
};
