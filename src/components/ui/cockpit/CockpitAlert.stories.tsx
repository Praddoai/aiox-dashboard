import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertTriangle } from 'lucide-react';
import { CockpitAlert } from './CockpitAlert';

const meta: Meta<typeof CockpitAlert> = {
  title: 'UI/Cockpit/CockpitAlert',
  component: CockpitAlert,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'AIOX Cockpit alert with border-left accent and icon support. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'System Update',
    children: 'A new version of the agent runtime is available. Restart to apply.',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 500 }}>
      <CockpitAlert variant="info" title="Info">
        Deployment pipeline is running. ETA 3 minutes.
      </CockpitAlert>
      <CockpitAlert variant="success" title="Success">
        All 47 tests passed. Build artifact ready.
      </CockpitAlert>
      <CockpitAlert variant="warning" title="Warning">
        Memory usage at 85%. Consider scaling up.
      </CockpitAlert>
      <CockpitAlert variant="error" title="Error">
        Connection to agent cluster lost. Retrying in 10s.
      </CockpitAlert>
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    variant: 'warning',
    title: 'Rate Limit',
    icon: <AlertTriangle size={14} />,
    children: 'API rate limit reached. Requests will be throttled for the next 60 seconds.',
  },
};
