import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProjectTabs } from './ProjectTabs';
import { useProjectStore, type Project } from '../../stores/projectStore';

const singleProject: Project[] = [
  { id: 'p-1', name: 'aios-core', path: '/aios-core', createdAt: '2025-01-01T00:00:00Z' },
];

const multipleProjects: Project[] = [
  { id: 'p-1', name: 'aios-core', path: '/aios-core', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'p-2', name: 'dashboard', path: '/dashboard', createdAt: '2025-01-02T00:00:00Z' },
  { id: 'p-3', name: 'api-server', path: '/api-server', createdAt: '2025-01-03T00:00:00Z' },
];

const manyProjects: Project[] = [
  { id: 'p-1', name: 'aios-core', path: '/aios-core', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'p-2', name: 'dashboard', path: '/dashboard', createdAt: '2025-01-02T00:00:00Z' },
  { id: 'p-3', name: 'api-server', path: '/api-server', createdAt: '2025-01-03T00:00:00Z' },
  { id: 'p-4', name: 'mobile-app', path: '/mobile-app', createdAt: '2025-01-04T00:00:00Z' },
  { id: 'p-5', name: 'design-system', path: '/design-system', createdAt: '2025-01-05T00:00:00Z' },
  { id: 'p-6', name: 'docs', path: '/docs', createdAt: '2025-01-06T00:00:00Z' },
  { id: 'p-7', name: 'infra', path: '/infra', createdAt: '2025-01-07T00:00:00Z' },
];

function ProjectTabsSingle() {
  useEffect(() => {
    useProjectStore.setState({ projects: singleProject, activeProjectId: 'p-1' });
  }, []);
  return <ProjectTabs />;
}

function ProjectTabsMultiple() {
  useEffect(() => {
    useProjectStore.setState({ projects: multipleProjects, activeProjectId: 'p-2' });
  }, []);
  return <ProjectTabs />;
}

function ProjectTabsMany() {
  useEffect(() => {
    useProjectStore.setState({ projects: manyProjects, activeProjectId: 'p-3' });
  }, []);
  return <ProjectTabs />;
}

const meta: Meta<typeof ProjectTabs> = {
  title: 'Layout/ProjectTabs',
  component: ProjectTabs,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Draggable project tab navigation using dnd-kit for reordering. Supports adding new projects inline, closing tabs with context menu, and close-others actions. Each tab shows the project name with a close button on hover.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleProject: Story = {
  render: () => <ProjectTabsSingle />,
};

export const MultipleProjects: Story = {
  render: () => <ProjectTabsMultiple />,
};

export const ManyProjects: Story = {
  render: () => <ProjectTabsMany />,
};
