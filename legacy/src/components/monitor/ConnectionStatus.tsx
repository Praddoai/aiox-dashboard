'use client';

import { StatusDot } from '@/components/ui/status-dot';
import { useMonitorStore } from '@/stores/monitor-store';

export default function ConnectionStatus() {
  const connected = useMonitorStore((s) => s.connected);

  return (
    <div className="flex items-center gap-2">
      <StatusDot
        status={connected ? 'working' : 'error'}
        size="md"
        glow={connected}
      />
      <span className="text-xs text-tertiary">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
