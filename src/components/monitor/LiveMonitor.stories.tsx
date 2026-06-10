import type { Meta, StoryObj } from '@storybook/react-vite';
import { Activity, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { GlassCard } from '../ui';
import { cn } from '../../lib/utils';

/**
 * LiveMonitor is the top-level monitor dashboard that composes
 * MetricsPanel, AgentStatusCards, EventList, AlertBanner, and ConnectionStatus.
 * Since it connects to monitorStore on mount, we provide a shell preview.
 */

function StatBlock({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className={cn('h-4 w-4', color)} />
      <span className="text-sm font-bold text-primary">{value}</span>
      <span className="text-[10px] text-tertiary">{label}</span>
    </div>
  );
}

function LiveMonitorShell({ connected, stats }: {
  connected: boolean;
  stats: { total: number; successRate: number; errorCount: number; activeSessions: number };
}) {
  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-primary">Live Monitor</h1>
          <span className={cn('h-2.5 w-2.5 rounded-full', connected ? 'bg-green-500 animate-pulse' : 'bg-gray-500')} />
          <span className="text-xs text-tertiary">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Metrics placeholder */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['CPU: 42%', 'Memory: 68%', 'Latency: 120ms', 'Throughput: 15 req/s'].map((text, i) => (
          <GlassCard key={i} padding="sm" variant="subtle">
            <p className="text-xs text-tertiary">{text.split(':')[0]}</p>
            <p className="text-lg font-bold text-primary">{text.split(':')[1]}</p>
          </GlassCard>
        ))}
      </div>

      {/* Agent cards placeholder */}
      <div className="grid grid-cols-4 gap-3">
        {['@dex', '@morgan', '@river', '@pax'].map((name) => (
          <GlassCard key={name} padding="sm" variant="subtle">
            <p className="text-sm font-semibold text-primary">{name}</p>
            <p className="text-xs text-tertiary">idle</p>
          </GlassCard>
        ))}
      </div>

      {/* Activity feed placeholder */}
      <GlassCard padding="sm" className="flex-1 overflow-hidden">
        <p className="text-xs text-tertiary">Activity Feed (5 events)</p>
        <div className="mt-2 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </GlassCard>

      {/* Stats footer */}
      <GlassCard padding="sm" variant="subtle" className="flex-shrink-0">
        <div className="grid grid-cols-4 gap-4">
          <StatBlock icon={Activity} label="Total Events" value={stats.total} color="text-blue-400" />
          <StatBlock icon={CheckCircle2} label="Success Rate" value={`${stats.successRate}%`} color="text-green-400" />
          <StatBlock icon={AlertCircle} label="Errors" value={stats.errorCount} color="text-red-400" />
          <StatBlock icon={Wifi} label="Sessions" value={stats.activeSessions} color="text-cyan-400" />
        </div>
      </GlassCard>
    </div>
  );
}

const meta: Meta<typeof LiveMonitorShell> = {
  title: 'Monitor/LiveMonitor',
  component: LiveMonitorShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main live monitoring dashboard composing metrics, agent cards, alerts, event feed, and stats. Connects to a WebSocket monitor server on mount.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    connected: { control: 'boolean', description: 'WebSocket connection state' },
  },
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

export const Connected: Story = {
  args: {
    connected: true,
    stats: { total: 142, successRate: 96, errorCount: 3, activeSessions: 2 },
  },
};

export const Disconnected: Story = {
  args: {
    connected: false,
    stats: { total: 0, successRate: 0, errorCount: 0, activeSessions: 0 },
  },
};

export const HighActivity: Story = {
  args: {
    connected: true,
    stats: { total: 1024, successRate: 89, errorCount: 47, activeSessions: 5 },
  },
};
