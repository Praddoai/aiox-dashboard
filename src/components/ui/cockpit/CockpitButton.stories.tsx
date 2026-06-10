import type { Meta, StoryObj } from '@storybook/react-vite';
import { CockpitButton } from './CockpitButton';

const meta: Meta<typeof CockpitButton> = {
  title: 'UI/Cockpit/CockpitButton',
  component: CockpitButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'AIOX Cockpit button — brutalist, mono uppercase, zero border-radius. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: 'Deploy', variant: 'primary' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <CockpitButton variant="primary">Primary</CockpitButton>
      <CockpitButton variant="secondary">Secondary</CockpitButton>
      <CockpitButton variant="ghost">Ghost</CockpitButton>
      <CockpitButton variant="destructive">Destructive</CockpitButton>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <CockpitButton size="sm">Small</CockpitButton>
      <CockpitButton size="md">Medium</CockpitButton>
      <CockpitButton size="lg">Large</CockpitButton>
    </div>
  ),
};

export const Loading: Story = {
  args: { children: 'Processing', loading: true },
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};
