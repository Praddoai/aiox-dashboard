import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowManager, CreateWorkflowModal } from './WorkflowManager';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ maxWidth: 900, padding: 24, background: '#0f0f14' }}>
        <WorkflowManager />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof WorkflowManager> = {
  title: 'Settings/WorkflowManager',
  component: WorkflowManager,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Workflow management settings UI. Displays workflow list with stats (total, active, step count), expandable details with a visual step-dependency graph, and a modal for creating new workflows with squad/agent assignment.',
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
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Wrapper />,
};

export const CreateModal: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <CreateWorkflowModal
        onClose={fn()}
        onSubmit={fn()}
        isLoading={false}
      />
    </QueryClientProvider>
  ),
  parameters: { layout: 'fullscreen' },
};

export const CreateModalLoading: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <CreateWorkflowModal
        onClose={fn()}
        onSubmit={fn()}
        isLoading
      />
    </QueryClientProvider>
  ),
  parameters: { layout: 'fullscreen' },
};
