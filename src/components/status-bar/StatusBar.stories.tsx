import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBar } from './StatusBar';

const meta: Meta<typeof StatusBar> = {
  title: 'Layout/StatusBar',
  component: StatusBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Bottom status bar displaying network connectivity, API rate limits, Claude LLM readiness, Bob pipeline status, active agent indicator, and notification count. Fixed to the bottom of the viewport.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '200px', position: 'relative' }}>
        <div style={{ padding: '16px' }}>
          <p className="text-secondary text-sm">Content above the status bar</p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FullPageContext: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: '400px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '24px' }}>
          <h2 className="text-primary text-lg font-bold mb-2">Application Page</h2>
          <p className="text-secondary text-sm">The status bar is fixed at the bottom of the viewport.</p>
        </div>
        <Story />
      </div>
    ),
  ],
};
