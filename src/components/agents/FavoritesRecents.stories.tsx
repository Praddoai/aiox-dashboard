import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FavoritesRecents } from './FavoritesRecents';

const meta: Meta<typeof FavoritesRecents> = {
  title: 'Agents/FavoritesRecents',
  component: FavoritesRecents,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Collapsible sidebar widget showing favorited and recently used agents. Reads from useFavorites hook (Zustand persisted store). Returns null when both lists are empty.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onAgentSelect: {
      action: 'agent-selected',
      description: 'Callback when an agent is selected from favorites or recents',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-72 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onAgentSelect: fn(),
  },
};
