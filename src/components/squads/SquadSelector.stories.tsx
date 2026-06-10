import type { Meta, StoryObj } from '@storybook/react-vite';
import { SquadSelector } from './SquadSelector';

/**
 * SquadSelector depends on useSquads() hook and useUIStore().
 * In Storybook we render it directly; the hooks will use their
 * default/fallback data (loading skeleton then cached data).
 */

const meta: Meta<typeof SquadSelector> = {
  title: 'Squads/SquadSelector',
  component: SquadSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Sidebar squad selector with categorized accordion groups. Squads are organized into domain categories (Content, Marketing, Creative, Development, etc.) with expandable sections and visual indicators.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 260, background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SquadSelector />,
};
