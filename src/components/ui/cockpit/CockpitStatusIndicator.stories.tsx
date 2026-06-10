import type { Meta, StoryObj } from '@storybook/react-vite';
import { CockpitStatusIndicator } from './CockpitStatusIndicator';

const meta: Meta<typeof CockpitStatusIndicator> = {
  title: 'UI/Cockpit/CockpitStatusIndicator',
  component: CockpitStatusIndicator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'AIOX Cockpit status dot with optional pulse animation and label. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['online', 'offline', 'warning', 'busy'],
    },
    pulse: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Online: Story = {
  args: { status: 'online', label: 'Agent Online' },
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <CockpitStatusIndicator status="online" label="Online" />
      <CockpitStatusIndicator status="busy" label="Busy" />
      <CockpitStatusIndicator status="warning" label="Warning" />
      <CockpitStatusIndicator status="offline" label="Offline" />
    </div>
  ),
};

export const NoPulse: Story = {
  args: { status: 'online', label: 'No Pulse', pulse: false },
};

export const DotOnly: Story = {
  args: { status: 'online' },
};
