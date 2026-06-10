import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggle, ThemeToggleSwitch } from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Theme toggle button that cycles through light, dark, glass, and matrix themes. Supports an optional dropdown for direct theme selection.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showDropdown: {
      control: 'boolean',
      description: 'Show a dropdown for direct theme selection instead of cycling',
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Button size',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showDropdown: false,
    size: 'md',
  },
};

export const WithDropdown: Story = {
  args: {
    showDropdown: true,
    size: 'md',
  },
};

export const SmallSize: Story = {
  args: {
    showDropdown: false,
    size: 'sm',
  },
};

export const SwitchVariant: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ color: 'var(--color-text-primary, #ccc)', fontSize: 14 }}>Toggle theme:</span>
      <ThemeToggleSwitch />
    </div>
  ),
};
