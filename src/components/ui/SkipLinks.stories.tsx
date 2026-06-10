import type { Meta, StoryObj } from '@storybook/react-vite';
import { SkipLinks } from './SkipLinks';

const meta: Meta<typeof SkipLinks> = {
  title: 'UI/SkipLinks',
  component: SkipLinks,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Accessibility skip navigation links. Hidden by default (sr-only) and become visible on keyboard focus. Allows users to skip directly to the main content area or navigation.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <SkipLinks />
      <div className="p-8 space-y-4">
        <p className="text-sm text-tertiary">
          The skip links are hidden by default. Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-primary font-mono text-xs">Tab</kbd> to
          focus the first skip link and see it appear at the top-left of the viewport.
        </p>
        <nav id="navigation" className="p-4 rounded-lg bg-white/5 border border-white/10">
          <p className="text-sm text-secondary">Navigation area</p>
        </nav>
        <main id="main-content" className="p-4 rounded-lg bg-white/5 border border-white/10">
          <p className="text-sm text-secondary">Main content area</p>
        </main>
      </div>
    </div>
  ),
};

export const Visible: Story = {
  name: 'Links Made Visible (for demo)',
  render: () => (
    <div className="p-8 space-y-4">
      <p className="text-xs text-tertiary mb-4">
        Below are the skip links rendered without sr-only for visibility:
      </p>
      <div className="flex gap-4">
        <a
          href="#main-content"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg outline-none text-sm"
        >
          Pular para o conteudo principal
        </a>
        <a
          href="#navigation"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg outline-none text-sm"
        >
          Pular para a navegacao
        </a>
      </div>
    </div>
  ),
};
