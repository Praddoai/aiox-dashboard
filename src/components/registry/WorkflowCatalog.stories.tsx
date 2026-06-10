import type { Meta, StoryObj } from '@storybook/react-vite';
import WorkflowCatalog from './WorkflowCatalog';

const meta: Meta<typeof WorkflowCatalog> = {
  title: 'Registry/WorkflowCatalog',
  component: WorkflowCatalog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Grid catalog of all 14 AIOS workflows with expandable phase timeline visualization showing agent handoffs.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ height: '100vh' }}>
      <WorkflowCatalog />
    </div>
  ),
};
