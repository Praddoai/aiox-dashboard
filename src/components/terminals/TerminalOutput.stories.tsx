import type { Meta, StoryObj } from '@storybook/react-vite';
import { TerminalOutput } from './TerminalOutput';

const typecheckOutput = [
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
];

const errorOutput = [
  '$ npm run build',
  '',
  '> aios-platform@0.1.0 build',
  '> vite build',
  '',
  'Error: Could not resolve "./components/monitor/MetricsPanel"',
  'Error: Module not found: @/utils/deprecated',
  'FAIL Build failed with 2 errors',
];

const mixedOutput = [
  '$ npm run test',
  '',
  'PASS src/components/ui/__tests__/GlassCard.test.tsx',
  'PASS src/components/ui/__tests__/Badge.test.tsx',
  'FAIL src/components/ui/__tests__/Dialog.test.tsx',
  '',
  '  \u2713 renders correctly (12ms)',
  '  \u2713 handles close event (8ms)',
  '  \u2717 validates input on submit (23ms)',
  '',
  'Error: Expected input to be validated',
  '',
  'Test Suites: 1 failed, 2 passed, 3 total',
  'Tests:       1 failed, 2 passed, 3 total',
];

const longOutput = Array.from({ length: 50 }, (_, i) => {
  if (i === 0) return '$ npm run build';
  if (i % 10 === 0) return `\u2713 Built module ${i}/50`;
  return `  Processing file_${i}.ts...`;
});

const meta: Meta<typeof TerminalOutput> = {
  title: 'Terminals/TerminalOutput',
  component: TerminalOutput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Terminal output display with ANSI color code parsing, heuristic syntax highlighting for commands/passes/failures, auto-scroll behavior, and a scroll-to-bottom button when the user scrolls up.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    lines: {
      control: false,
      description: 'Array of output lines to display',
    },
    isActive: {
      control: 'boolean',
      description: 'When true, shows a blinking cursor indicating the terminal is actively running',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '500px', height: '300px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SuccessOutput: Story = {
  args: {
    lines: typecheckOutput,
    isActive: false,
  },
};

export const ErrorOutput: Story = {
  args: {
    lines: errorOutput,
    isActive: false,
  },
};

export const MixedResults: Story = {
  args: {
    lines: mixedOutput,
    isActive: false,
  },
};

export const ActiveWithCursor: Story = {
  args: {
    lines: typecheckOutput,
    isActive: true,
  },
};

export const LongScrollable: Story = {
  args: {
    lines: longOutput,
    isActive: false,
  },
};
