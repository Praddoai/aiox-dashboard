import type { Meta, StoryObj } from '@storybook/react-vite';
import QAMetrics from './QAMetrics';

const meta: Meta<typeof QAMetrics> = {
  title: 'Views/QAMetrics',
  component: QAMetrics,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'QA metrics dashboard displaying review stats (total reviews, pass rate, avg time, critical issues), daily pass/fail trend chart, validation module status cards, pattern feedback acceptance rate, and a gotchas registry. Uses inline mock data.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InNarrowViewport: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', maxWidth: 480, background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};

export const InWideViewport: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', maxWidth: 1400, background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};
