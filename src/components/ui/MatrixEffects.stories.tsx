import type { Meta, StoryObj } from '@storybook/react-vite';
import { MatrixEffects } from './MatrixEffects';

const meta: Meta<typeof MatrixEffects> = {
  title: 'UI/MatrixEffects',
  component: MatrixEffects,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Matrix-style digital rain canvas effect with an optional boot sequence overlay. The boot sequence runs once per session (uses sessionStorage).',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', background: '#010401', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDarkBackground: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
        <Story />
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6eff6e',
            fontFamily: 'monospace',
            fontSize: '2rem',
          }}
        >
          Content above the matrix
        </div>
      </div>
    ),
  ],
};
