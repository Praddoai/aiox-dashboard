import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cpu, HardDrive, Clock, Zap } from 'lucide-react';
import { GlassCard, ProgressBar } from '../ui';
import { cn } from '../../lib/utils';

/**
 * MetricsPanel uses the monitorStore. This presentational
 * version accepts metrics as props.
 */

interface Metrics {
  cpu: number;
  memory: number;
  latency: number;
  throughput: number;
}

function getVariant(value: number): 'default' | 'warning' | 'error' {
  if (value > 80) return 'error';
  if (value > 60) return 'warning';
  return 'default';
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  showProgress,
  color,
}: {
  icon: typeof Cpu;
  label: string;
  value: number;
  unit: string;
  showProgress?: boolean;
  color: string;
}) {
  const variant = showProgress ? getVariant(value) : 'default';
  return (
    <GlassCard padding="sm" variant="subtle">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-[10px] text-tertiary uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold text-primary tabular-nums">
        {value}
        <span className="text-xs text-tertiary font-normal ml-0.5">{unit}</span>
      </div>
      {showProgress && <ProgressBar value={value} size="sm" variant={variant} glow={variant === 'error'} className="mt-2" />}
    </GlassCard>
  );
}

function MetricsPanelPresentation({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard icon={Cpu} label="CPU" value={metrics.cpu} unit="%" showProgress color="text-blue-400" />
      <MetricCard icon={HardDrive} label="Memory" value={metrics.memory} unit="%" showProgress color="text-purple-400" />
      <MetricCard icon={Clock} label="Latency" value={metrics.latency} unit="ms" color="text-yellow-400" />
      <MetricCard icon={Zap} label="Throughput" value={metrics.throughput} unit="req/s" color="text-green-400" />
    </div>
  );
}

const meta: Meta<typeof MetricsPanelPresentation> = {
  title: 'Monitor/MetricsPanel',
  component: MetricsPanelPresentation,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'System metrics panel displaying CPU, memory, latency, and throughput with progress bars and color-coded thresholds (>60% warning, >80% error).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    metrics: { control: 'object', description: 'System metrics object' },
  },
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    metrics: { cpu: 35, memory: 52, latency: 120, throughput: 15 },
  },
};

export const HighLoad: Story = {
  args: {
    metrics: { cpu: 92, memory: 88, latency: 450, throughput: 3 },
  },
};

export const WarningLevel: Story = {
  args: {
    metrics: { cpu: 72, memory: 65, latency: 250, throughput: 8 },
  },
};

export const Idle: Story = {
  args: {
    metrics: { cpu: 2, memory: 18, latency: 45, throughput: 0 },
  },
};
