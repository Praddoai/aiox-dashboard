import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CategoryManager } from './CategoryManager';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ maxWidth: 720, padding: 24, background: '#0f0f14' }}>
        <CategoryManager />
      </div>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof CategoryManager> = {
  title: 'Settings/CategoryManager',
  component: CategoryManager,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Category management UI for organizing squads into drag-and-drop categories. Supports creating, editing, deleting, and reordering categories. Each category maps to a squad type with themed styling.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Wrapper />,
};

export const InFullWidth: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: '100%', padding: 24, background: '#0f0f14' }}>
        <CategoryManager />
      </div>
    </QueryClientProvider>
  ),
};
