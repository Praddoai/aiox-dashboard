import type { Meta, StoryObj } from '@storybook/react-vite';
import { CockpitTickerStrip } from './CockpitTickerStrip';

const meta: Meta<typeof CockpitTickerStrip> = {
  title: 'UI/Cockpit/CockpitTickerStrip',
  component: CockpitTickerStrip,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'AIOX Cockpit infinite scrolling ticker strip. Best viewed with AIOX theme.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: ['System Online', 'Build #1247 Passed', '8 Agents Active', 'Latency 42ms', 'Memory 64%'],
    speed: 20,
  },
};

export const Fast: Story = {
  args: {
    items: ['ALERT', 'DEPLOY IN PROGRESS', 'v2.4.1', 'ETA 3 MIN'],
    speed: 10,
  },
};
