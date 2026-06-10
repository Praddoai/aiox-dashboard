import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MobileNav, MobileHeader, PullToRefresh } from './MobileNav';

const meta: Meta<typeof MobileNav> = {
  title: 'Layout/MobileNav',
  component: MobileNav,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Mobile bottom navigation bar with icons for Chat, World, Tasks, Dashboard, and Settings views. Also exports MobileHeader and PullToRefresh components for mobile-specific layouts.',
      },
    },
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '375px', height: '667px', position: 'relative', margin: '0 auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ height: 'calc(100% - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-secondary text-sm">Main content area</p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export const MobileHeaderDefault: Story = {
  render: () => (
    <div style={{ width: '375px', margin: '0 auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
      <MobileHeader title="Chat" onBack={fn()} />
      <div style={{ padding: '16px' }}>
        <p className="text-secondary text-sm">Page content below the mobile header</p>
      </div>
    </div>
  ),
};

export const MobileHeaderWithActions: Story = {
  render: () => (
    <div style={{ width: '375px', margin: '0 auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
      <MobileHeader
        title="Agent Details"
        onBack={fn()}
        actions={
          <button className="h-10 w-10 flex items-center justify-center rounded-xl glass-button text-secondary" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        }
      />
    </div>
  ),
};

export const PullToRefreshDemo: Story = {
  render: () => (
    <div style={{ width: '375px', height: '500px', margin: '0 auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
      <PullToRefresh
        onRefresh={async () => {
          fn()();
          await new Promise((r) => setTimeout(r, 1500));
        }}
      >
        <div style={{ padding: '16px' }}>
          <p className="text-secondary text-sm mb-4">Pull down to refresh (touch devices)</p>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="glass-card rounded-lg p-3 mb-2 border border-glass-border">
              <p className="text-primary text-sm">Item {i + 1}</p>
            </div>
          ))}
        </div>
      </PullToRefresh>
    </div>
  ),
};
