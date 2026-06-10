import type { Meta, StoryObj } from '@storybook/react-vite';
import TaskCatalog from './TaskCatalog';

const meta: Meta<typeof TaskCatalog> = {
  title: 'Registry/TaskCatalog',
  component: TaskCatalog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Searchable catalog of all 202 AIOS tasks with agent filtering. Shows task ID, description, responsible agent, and interactivity indicator.',
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
      <TaskCatalog />
    </div>
  ),
};
