import type { Meta, StoryObj } from '@storybook/react-vite';
import SquadsView from './SquadsView';

/**
 * SquadsView is a page-level component that internally manages three drill-down levels:
 * 1. Squad grid (organogram)
 * 2. Squad detail with tabs (overview, org chart, connections)
 * 3. Agent detail
 *
 * It uses hooks (useSquads, useAgents, useSquadStats, useAgent) and falls back to
 * placeholder data when the API returns empty. This means it renders meaningfully
 * even without a running backend.
 */

const meta: Meta<typeof SquadsView> = {
  title: 'SquadsView/SquadsView',
  component: SquadsView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main squads overview page with three drill-down levels: squad grid, squad detail (with overview/org chart/connections tabs), and agent detail. Uses placeholder data when the API is unavailable.',
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
      <SquadsView />
    </div>
  ),
};
