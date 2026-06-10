import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Top header bar containing the global search button (Cmd+K), AIOS Master access, notification center, agent explorer toggle, workflow view toggle, activity panel toggle, theme toggle, and user menu.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FullWidth: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

export const NarrowViewport: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '375px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};
