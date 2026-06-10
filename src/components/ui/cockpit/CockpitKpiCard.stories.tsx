import type { Meta, StoryObj } from '@storybook/react-vite';
import { CockpitKpiCard } from './CockpitKpiCard';

const meta: Meta<typeof CockpitKpiCard> = {
  title: 'UI/Cockpit/CockpitKpiCard',
  component: CockpitKpiCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'AIOX Cockpit KPI metric card with trend indicator. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    trend: {
      control: 'select',
      options: ['up', 'down', 'neutral'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Tasks Completed',
    value: '1,247',
    change: '+12.5% vs last week',
    trend: 'up',
  },
};

export const TrendVariants: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 200px)', gap: '1rem' }}>
      <CockpitKpiCard label="Uptime" value="99.9%" change="+0.1%" trend="up" />
      <CockpitKpiCard label="Error Rate" value="0.3%" change="+0.05%" trend="down" />
      <CockpitKpiCard label="Latency" value="42ms" change="No change" trend="neutral" />
    </div>
  ),
};

export const NoChange: Story = {
  args: {
    label: 'Active Agents',
    value: '8',
  },
};
