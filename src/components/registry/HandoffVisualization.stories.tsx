import type { Meta, StoryObj } from '@storybook/react-vite';
import HandoffVisualization from './HandoffVisualization';

const meta: Meta<typeof HandoffVisualization> = {
  title: 'Registry/HandoffVisualization',
  component: HandoffVisualization,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Handoff flow visualization showing workflow pipelines and agent delegation relationships. Expandable cards reveal phase details.',
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
      <HandoffVisualization />
    </div>
  ),
};
