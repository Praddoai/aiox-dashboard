import type { Meta, StoryObj } from '@storybook/react-vite';
import AuthorityMatrix from './AuthorityMatrix';

const meta: Meta<typeof AuthorityMatrix> = {
  title: 'Registry/AuthorityMatrix',
  component: AuthorityMatrix,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Delegation authority matrix showing agent relationships (delegates to, receives from, exclusive ops) in table and graph views.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ height: '100vh' }}>
      <AuthorityMatrix />
    </div>
  ),
};
