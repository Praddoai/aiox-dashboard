import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WorldWorkflowPanel } from './WorldWorkflowPanel';

const meta: Meta<typeof WorldWorkflowPanel> = {
  title: 'World/WorldWorkflowPanel',
  component: WorldWorkflowPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Bottom panel overlay that displays business workflow pipelines. Shows pipeline steps as connected nodes with status indicators (pending, active, completed, failed). Hovering a workflow highlights its rooms on the world map. Clicking a step navigates to that room.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    expanded: { control: 'boolean', description: 'Whether the panel content is expanded' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: 300,
          background: '#0d0d1a',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  args: {
    expanded: false,
    onToggle: fn(),
    onHighlightRooms: fn(),
    onRoomClick: fn(),
  },
};

export const Expanded: Story = {
  args: {
    expanded: true,
    onToggle: fn(),
    onHighlightRooms: fn(),
    onRoomClick: fn(),
  },
};
