import type { Meta, StoryObj } from '@storybook/react-vite';
import AgentDirectory from './AgentDirectory';

const meta: Meta<typeof AgentDirectory> = {
  title: 'Registry/AgentDirectory',
  component: AgentDirectory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Browsable directory of all AIOS agents with search and detail panel. Data sourced from the build-time generated registry.',
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
      <AgentDirectory />
    </div>
  ),
};
