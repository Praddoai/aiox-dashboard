import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * WorkflowView is the main workflow page that orchestrates sub-components
 * (WorkflowCanvas, WorkflowSidebar, WorkflowExecutionLive) and connects
 * to multiple API hooks and stores. Since it is a fully composed page,
 * we render lightweight wrapper stories that illustrate its layout.
 */

function WorkflowViewShell({ status }: { status: 'idle' | 'running' | 'completed' }) {
  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-background-primary, #0d1015)' }}>
      {/* Toolbar mock */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">Workflows</h1>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              status === 'running'
                ? 'bg-orange-500/20 text-orange-400'
                : status === 'completed'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 rounded-lg bg-white/5 border border-white/10" />
          <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar placeholder */}
        <div className="w-80 border-r border-white/10 p-4 space-y-3" style={{ background: 'rgba(15,15,20,0.65)' }}>
          <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
        </div>

        {/* Canvas placeholder */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/30 text-sm">
              {status === 'idle'
                ? 'Select a workflow to visualize'
                : status === 'running'
                ? 'Workflow executing...'
                : 'Execution complete'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof WorkflowViewShell> = {
  title: 'Workflow/WorkflowView',
  component: WorkflowViewShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main workflow page that combines toolbar, sidebar, and canvas. Since it relies on API hooks and stores, these stories show the page layout shell with different states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'running', 'completed'],
      description: 'Simulated page status',
    },
  },
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

export const Idle: Story = {
  args: { status: 'idle' },
};

export const Running: Story = {
  args: { status: 'running' },
};

export const Completed: Story = {
  args: { status: 'completed' },
};
