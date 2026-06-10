import type { Meta, StoryObj } from '@storybook/react-vite';
import { AioxLogo } from './AioxLogo';

const meta: Meta<typeof AioxLogo> = {
  title: 'UI/AioxLogo',
  component: AioxLogo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'AIOX brand mark and logotype. Uses currentColor so it inherits text color from parent.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['icon', 'full'],
      description: 'Icon-only circle mark or full logotype with "AIOX" text',
    },
    size: {
      control: { type: 'range', min: 16, max: 128, step: 4 },
      description: 'Height in pixels (width auto-scales for full variant)',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Icon: Story = {
  args: {
    variant: 'icon',
    size: 48,
  },
};

export const Full: Story = {
  args: {
    variant: 'full',
    size: 48,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <AioxLogo variant="icon" size={16} />
      <AioxLogo variant="icon" size={24} />
      <AioxLogo variant="icon" size={32} />
      <AioxLogo variant="icon" size={48} />
      <AioxLogo variant="icon" size={64} />
    </div>
  ),
};

export const FullSizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <AioxLogo variant="full" size={24} />
      <AioxLogo variant="full" size={32} />
      <AioxLogo variant="full" size={48} />
      <AioxLogo variant="full" size={64} />
    </div>
  ),
};

export const CustomColor: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <span className="text-blue-500">
        <AioxLogo variant="icon" size={48} />
      </span>
      <span className="text-green-500">
        <AioxLogo variant="icon" size={48} />
      </span>
      <span className="text-purple-500">
        <AioxLogo variant="full" size={48} />
      </span>
    </div>
  ),
};
