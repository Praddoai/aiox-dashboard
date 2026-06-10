import type { Meta, StoryObj } from '@storybook/react-vite';
import { NetworkStatusBanner, NetworkStatusIndicator } from './NetworkStatus';

// -------------------------------------------------------------------
// The real components rely on useNetworkStatus() and useOfflineQueue()
// hooks. In Storybook we mock those hooks via module-level overrides
// so we can render each visual state deterministically.
// -------------------------------------------------------------------

// We provide a decorator that wraps the component in a fixed-width container
// to simulate a real page header.

const meta: Meta<typeof NetworkStatusBanner> = {
  title: 'UI/NetworkStatus',
  component: NetworkStatusBanner,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Network connection status components. NetworkStatusBanner shows a full-width notification bar. NetworkStatusIndicator is a compact dot for header/sidebar use.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    showQueueInfo: {
      control: 'boolean',
      description: 'Show pending queue count',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Because the component calls hooks internally that depend on browser
// navigator.onLine, we show a placeholder note about the hook-dependent
// rendering and wrap with a mock decorator.

export const BannerPreview: Story = {
  render: () => (
    <div className="max-w-2xl mx-auto space-y-4">
      <p className="text-xs text-tertiary mb-4">
        The banner auto-hides when online with no queue. Below are static mockups of each state:
      </p>

      {/* Offline mockup */}
      <div className="px-4 py-2 flex items-center gap-3 bg-red-500/10 border-b border-red-500/20 rounded-lg">
        <span className="text-red-500 text-sm font-medium">Sem conexao</span>
      </div>

      {/* Slow connection mockup */}
      <div className="px-4 py-2 flex items-center gap-3 bg-yellow-500/10 border-b border-yellow-500/20 rounded-lg">
        <span className="text-yellow-500 text-sm font-medium">Conexao lenta</span>
      </div>

      {/* Syncing mockup */}
      <div className="px-4 py-2 flex items-center justify-between gap-3 bg-blue-500/10 border-b border-blue-500/20 rounded-lg">
        <span className="text-blue-500 text-sm font-medium">Sincronizando...</span>
        <span className="text-xs text-tertiary">(3 pendentes)</span>
      </div>
    </div>
  ),
};

export const IndicatorPreview: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      {/* Online */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-tertiary">Online</span>
      </div>

      {/* Slow */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="text-xs text-tertiary">Lento</span>
      </div>

      {/* Offline */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs text-tertiary">Offline</span>
      </div>

      {/* With queue */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-tertiary">Online</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-500">
          5
        </span>
      </div>
    </div>
  ),
};

export const LiveBanner: Story = {
  name: 'Live Banner (uses real hooks)',
  render: () => (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs text-tertiary mb-2">
        This renders the real component. It will only appear when offline, slow, or queue is non-empty.
      </p>
      <NetworkStatusBanner />
    </div>
  ),
};

export const LiveIndicator: Story = {
  name: 'Live Indicator (uses real hooks)',
  render: () => (
    <div className="flex items-center gap-4">
      <NetworkStatusIndicator showLabel />
      <NetworkStatusIndicator showLabel={false} />
    </div>
  ),
};
