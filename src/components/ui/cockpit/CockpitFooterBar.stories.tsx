import type { Meta, StoryObj } from '@storybook/react-vite';
import { CockpitFooterBar } from './CockpitFooterBar';

const meta: Meta<typeof CockpitFooterBar> = {
  title: 'UI/Cockpit/CockpitFooterBar',
  component: CockpitFooterBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'AIOX Cockpit footer information bar. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    left: 'AIOS Platform v2.4.1',
    center: 'Synkra Labs',
    right: '2026',
  },
};

export const Minimal: Story = {
  args: {
    left: 'Build #1247',
  },
};
