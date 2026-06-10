import type { Meta, StoryObj } from '@storybook/react-vite';
import GitHubView from './GitHubView';

const meta: Meta<typeof GitHubView> = {
  title: 'Views/GitHubView',
  component: GitHubView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'GitHub integration view that fetches commits, pull requests, and issues from a monitor API. Shows connection status, tabbed navigation, ref badges, PR state indicators, and issue labels. Handles loading, error, and disconnected states.',
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

export const InCompactContainer: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: 600, maxWidth: 700, background: '#0f0f14' }}>
        <Story />
      </div>
    ),
  ],
};
