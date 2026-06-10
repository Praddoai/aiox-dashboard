import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommandPalette } from './CommandPalette';
import { useUIStore } from '../../stores/uiStore';

/**
 * Decorator that opens the command palette on mount by setting
 * `commandPaletteOpen: true` in the UI store.
 */
function OpenPaletteDecorator({ children }: { children: React.ReactNode }) {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    setCommandPaletteOpen(true);
    return () => setCommandPaletteOpen(false);
  }, [setCommandPaletteOpen]);

  return <>{children}</>;
}

const meta: Meta<typeof CommandPalette> = {
  title: 'CommandPalette/CommandPalette',
  component: CommandPalette,
  parameters: {
    layout: 'fullscreen',
    a11y: { disable: true }, // palette overlay has heading-order issues by design
    docs: {
      description: {
        component:
          'Global Cmd+K command palette overlay for searching and executing AIOS agent commands. Reads from the build-time generated registry.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <OpenPaletteDecorator>
        <div style={{ height: '100vh', background: '#0a0a0f' }}>
          <Story />
        </div>
      </OpenPaletteDecorator>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
