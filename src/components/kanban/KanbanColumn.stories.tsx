import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DndContext } from '@dnd-kit/core';
import { ClipboardList, RefreshCw, CheckCircle } from 'lucide-react';
import { KanbanColumn, type ColumnConfig } from './KanbanColumn';
import type { Story as StoryType } from '../../stores/storyStore';

const backlogColumn: ColumnConfig = {
  id: 'backlog',
  label: 'Backlog',
  color: '#6b7280',
  icon: ClipboardList,
};

const inProgressColumn: ColumnConfig = {
  id: 'in_progress',
  label: 'In Progress',
  color: '#3b82f6',
  icon: RefreshCw,
};

const doneColumn: ColumnConfig = {
  id: 'done',
  label: 'Done',
  color: '#10b981',
  icon: CheckCircle,
};

const mockStories: StoryType[] = [
  {
    id: 'story-k1',
    title: 'Implement user authentication flow',
    description: 'Add login, signup, and password reset functionality.',
    status: 'backlog',
    priority: 'high',
    complexity: 'complex',
    category: 'feature',
    assignedAgent: 'aios-dev',
    progress: 0,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 'story-k2',
    title: 'Fix responsive layout on mobile',
    status: 'backlog',
    priority: 'medium',
    complexity: 'simple',
    category: 'fix',
    progress: 0,
    createdAt: '2026-02-21T10:00:00Z',
    updatedAt: '2026-02-21T10:00:00Z',
  },
  {
    id: 'story-k3',
    title: 'Update component documentation',
    status: 'backlog',
    priority: 'low',
    complexity: 'simple',
    category: 'docs',
    bobOrchestrated: true,
    progress: 0,
    createdAt: '2026-02-22T10:00:00Z',
    updatedAt: '2026-02-22T10:00:00Z',
  },
];

function ColumnWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DndContext>
      <div style={{ width: 300 }}>{children}</div>
    </DndContext>
  );
}

const meta: Meta<typeof KanbanColumn> = {
  title: 'Kanban/KanbanColumn',
  component: KanbanColumn,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A single kanban column displaying a list of story cards. Supports drag-and-drop via dnd-kit, collapsing, and adding new stories.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    column: {
      control: false,
      description: 'Column configuration with id, label, color, and icon',
    },
    stories: {
      control: false,
      description: 'Array of stories to display in the column',
    },
    onStoryClick: {
      description: 'Callback when a story card is clicked',
    },
    onAddStory: {
      description: 'Callback when the add story button is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithStories: Story = {
  render: () => (
    <ColumnWrapper>
      <KanbanColumn
        column={backlogColumn}
        stories={mockStories}
        onStoryClick={fn()}
        onAddStory={fn()}
      />
    </ColumnWrapper>
  ),
};

export const EmptyColumn: Story = {
  render: () => (
    <ColumnWrapper>
      <KanbanColumn
        column={inProgressColumn}
        stories={[]}
        onStoryClick={fn()}
        onAddStory={fn()}
      />
    </ColumnWrapper>
  ),
};

export const DoneColumn: Story = {
  render: () => (
    <ColumnWrapper>
      <KanbanColumn
        column={doneColumn}
        stories={[
          {
            id: 'story-done-1',
            title: 'Setup CI/CD pipeline',
            status: 'done',
            priority: 'high',
            complexity: 'standard',
            category: 'feature',
            assignedAgent: 'aios-devops',
            progress: 100,
            createdAt: '2026-02-10T10:00:00Z',
            updatedAt: '2026-02-20T10:00:00Z',
          },
        ]}
        onStoryClick={fn()}
        onAddStory={fn()}
      />
    </ColumnWrapper>
  ),
};
