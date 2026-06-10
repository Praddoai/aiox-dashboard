import type { Meta, StoryObj } from '@storybook/react-vite';
import { CockpitSpinner } from './CockpitSpinner';

const meta: Meta<typeof CockpitSpinner> = {
  title: 'UI/Cockpit/CockpitSpinner',
  component: CockpitSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'AIOX Cockpit loading spinner with neon lime accent. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { size: 'md' },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <CockpitSpinner size="sm" />
      <CockpitSpinner size="md" />
      <CockpitSpinner size="lg" />
    </div>
  ),
};
