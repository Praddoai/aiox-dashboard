'use client';

import { Cpu, HardDrive, Clock, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useMonitorStore } from '@/stores/monitor-store';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: typeof Cpu;
  label: string;
  value: number;
  unit: string;
  showProgress?: boolean;
  color: string;
}

function getProgressColor(value: number): string {
  if (value > 80) return 'var(--status-error, #EF4444)';
  if (value > 60) return 'var(--status-warning, #F59E0B)';
  return 'var(--accent-gold, #22C55E)';
}

function MetricCard({ icon: Icon, label, value, unit, showProgress, color }: MetricCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-[10px] text-tertiary uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className="text-lg font-bold text-primary tabular-nums">
        {value}
        <span className="text-xs text-tertiary font-normal ml-0.5">{unit}</span>
      </div>
      {showProgress && (
        <ProgressBar
          progress={value}
          size="sm"
          color={getProgressColor(value)}
          glow={value > 80}
          className="mt-2"
        />
      )}
    </Card>
  );
}

export default function MetricsPanel() {
  const stats = useMonitorStore((s) => s.stats);

  // Derive simple metrics from stats if available
  const cpu = 0;
  const memory = 0;
  const latency = 0;
  const throughput = stats?.total ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        icon={Cpu}
        label="CPU"
        value={cpu}
        unit="%"
        showProgress
        color="text-blue-400"
      />
      <MetricCard
        icon={HardDrive}
        label="Memory"
        value={memory}
        unit="%"
        showProgress
        color="text-purple-400"
      />
      <MetricCard
        icon={Clock}
        label="Latency"
        value={latency}
        unit="ms"
        color="text-yellow-400"
      />
      <MetricCard
        icon={Zap}
        label="Throughput"
        value={throughput}
        unit="req/s"
        color="text-green-400"
      />
    </div>
  );
}
