import type { Meta, StoryObj } from '@storybook/react-vite';
import { CockpitBadge } from './CockpitBadge';

const meta: Meta<typeof CockpitBadge> = {
  title: 'UI/Cockpit/CockpitBadge',
  component: CockpitBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'AIOX Cockpit badge — brutalist mono/uppercase style. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['lime', 'surface', 'error', 'blue', 'solid'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Active',
    variant: 'lime',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <CockpitBadge variant="lime">Lime</CockpitBadge>
      <CockpitBadge variant="surface">Surface</CockpitBadge>
      <CockpitBadge variant="error">Error</CockpitBadge>
      <CockpitBadge variant="blue">Blue</CockpitBadge>
      <CockpitBadge variant="solid">Solid</CockpitBadge>
    </div>
  ),
};
