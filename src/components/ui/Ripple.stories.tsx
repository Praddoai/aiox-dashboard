import type { Meta, StoryObj } from '@storybook/react-vite';
import { RippleWrapper } from './Ripple';

const meta: Meta<typeof RippleWrapper> = {
  title: 'UI/Ripple',
  component: RippleWrapper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Material-like ripple effect wrapper. Wrap any element to add a ripple on click / tap.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'color',
      description: 'Ripple color (CSS color value)',
    },
    duration: {
      control: { type: 'number', min: 200, max: 2000, step: 100 },
      description: 'Ripple animation duration in milliseconds',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for the wrapper',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 2rem',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--color-text-primary, #ccc)',
  cursor: 'pointer',
  userSelect: 'none',
  textAlign: 'center',
};

export const Default: Story = {
  args: {
    children: <div style={buttonStyle}>Click me for ripple</div>,
  },
};

export const CustomColor: Story = {
  args: {
    color: 'rgba(59, 130, 246, 0.5)',
    children: <div style={{ ...buttonStyle, borderColor: 'rgba(59,130,246,0.3)' }}>Blue ripple</div>,
  },
};

export const SlowRipple: Story = {
  args: {
    duration: 1200,
    children: <div style={buttonStyle}>Slow ripple (1200ms)</div>,
  },
};
