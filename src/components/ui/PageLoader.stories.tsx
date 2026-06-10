import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageLoader, InlineLoader } from './PageLoader';

const meta: Meta<typeof PageLoader> = {
  title: 'UI/PageLoader',
  component: PageLoader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full-page and inline loading indicators with animated spinner.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      control: 'text',
      description: 'Loading message text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="h-64">
        <Story />
      </div>
    ),
  ],
};

export const CustomMessage: Story = {
  args: {
    message: 'Loading agents...',
  },
  decorators: [
    (Story) => (
      <div className="h-64">
        <Story />
      </div>
    ),
  ],
};

export const InlineSmall: Story = {
  parameters: {
    layout: 'centered',
  },
  render: () => <InlineLoader size="sm" />,
};

export const InlineMedium: Story = {
  parameters: {
    layout: 'centered',
  },
  render: () => <InlineLoader size="md" />,
};

export const InlineLarge: Story = {
  parameters: {
    layout: 'centered',
  },
  render: () => <InlineLoader size="lg" />,
};

export const AllInlineSizes: Story = {
  parameters: {
    layout: 'centered',
  },
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <InlineLoader size="sm" />
        <span className="text-xs text-secondary">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <InlineLoader size="md" />
        <span className="text-xs text-secondary">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <InlineLoader size="lg" />
        <span className="text-xs text-secondary">Large</span>
      </div>
    </div>
  ),
};
