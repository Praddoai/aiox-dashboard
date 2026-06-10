import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppLayout } from './AppLayout';

const meta: Meta<typeof AppLayout> = {
  title: 'Layout/AppLayout',
  component: AppLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main application layout wrapper that composes the Sidebar, Header, ProjectTabs, ActivityPanel, StatusBar, and MobileNav into a responsive grid layout. Supports multiple themes including matrix and glass.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: false,
      description: 'Main content to render inside the layout',
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

export const Default: Story = {
  args: {
    children: (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Main Content Area</h1>
          <p className="text-secondary">This is where the current view renders.</p>
        </div>
      </div>
    ),
  },
};

export const WithDashboardContent: Story = {
  args: {
    children: (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-primary">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Agents Online', 'Tasks Running', 'Stories Done'].map((label) => (
            <div
              key={label}
              className="glass-card rounded-xl p-4 border border-glass-border"
            >
              <p className="text-tertiary text-xs mb-1">{label}</p>
              <p className="text-2xl font-bold text-primary">
                {Math.floor(Math.random() * 20) + 1}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
};

export const WithEmptyContent: Story = {
  args: {
    children: (
      <div className="flex items-center justify-center h-full">
        <p className="text-tertiary text-sm">No content to display</p>
      </div>
    ),
  },
};
