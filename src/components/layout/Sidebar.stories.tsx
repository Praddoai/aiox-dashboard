import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../stores/uiStore';
import { useEffect } from 'react';

/**
 * Wrapper that sets the sidebar to expanded state for the story.
 */
function SidebarExpanded() {
  useEffect(() => {
    useUIStore.setState({ sidebarCollapsed: false });
  }, []);
  return <Sidebar />;
}

/**
 * Wrapper that sets the sidebar to collapsed state for the story.
 */
function SidebarCollapsed() {
  useEffect(() => {
    useUIStore.setState({ sidebarCollapsed: true });
  }, []);
  return <Sidebar />;
}

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main sidebar navigation with desktop and mobile variants. Desktop sidebar supports expanded (220px) and collapsed (72px) states. Mobile sidebar renders as a slide-in drawer with backdrop overlay. Includes navigation items for all views (Chat, Dashboard, World, Kanban, Agents, etc.).',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto', display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  render: () => <SidebarExpanded />,
};

export const Collapsed: Story = {
  render: () => <SidebarCollapsed />,
};

export const Default: Story = {};
