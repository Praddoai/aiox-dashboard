import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionLabel } from './SectionLabel';
import { GlassButton } from './GlassButton';

const meta: Meta<typeof SectionLabel> = {
  title: 'UI/SectionLabel',
  component: SectionLabel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A section heading label with optional count badge and action slot.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Label text content',
    },
    count: {
      control: 'number',
      description: 'Optional count badge',
    },
    action: {
      control: false,
      description: 'Optional action element (e.g. a button)',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Active Agents',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithCount: Story = {
  args: {
    children: 'Conversations',
    count: 12,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithAction: Story = {
  render: () => (
    <div className="w-80">
      <SectionLabel action={<GlassButton size="sm" variant="ghost">View All</GlassButton>}>
        Recent Activity
      </SectionLabel>
    </div>
  ),
};

export const Complete: Story = {
  render: () => (
    <div className="w-80">
      <SectionLabel
        count={5}
        action={<GlassButton size="sm" variant="ghost">Manage</GlassButton>}
      >
        Squad Members
      </SectionLabel>
    </div>
  ),
};
