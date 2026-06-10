'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import { useMonitorEvents } from '@/hooks/use-monitor-events';
import { useMonitorStore } from '@/stores/monitor-store';
import { ActivityFeed } from './ActivityFeed';
import { CurrentToolIndicator } from './CurrentToolIndicator';
import { MonitorStatus } from './MonitorStatus';

interface MonitorPanelProps {
  className?: string;
}

export const MonitorPanel = memo(function MonitorPanel({ className }: MonitorPanelProps) {
  // Initialize WebSocket connection
  useMonitorEvents();

  const connected = useMonitorStore((state) => state.connected);
  const stats = useMonitorStore((state) => state.stats);
  const clearEvents = useMonitorStore((state) => state.clearEvents);

  const ActivityIcon = iconMap['activity'];
  const TrashIcon = iconMap['trash'];
  const RefreshIcon = iconMap['refresh'];

  return (
    <div
      className={cn('flex flex-col h-full bg-[var(--bg-base)]', className)}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]"
      >
        <div className="flex items-center gap-3">
          <ActivityIcon className="h-4 w-4 text-gold" />
          <div>
            <h2 className="text-sm font-light text-text-primary">
              Live Monitor
            </h2>
            <span className="text-detail text-text-muted">
              Real-time Claude Code activity
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MonitorStatus />

          {connected && (
            <button
              onClick={clearEvents}
              className="p-1.5 transition-colors hover:opacity-80 text-text-muted"
              title="Clear events"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Current Tool Indicator */}
      {connected && (
        <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
          <CurrentToolIndicator />
        </div>
      )}

      {/* Activity Feed */}
      <div className="flex-1 overflow-hidden">
        <ActivityFeed />
      </div>

      {/* Stats Footer */}
      {connected && stats && (
        <div
          className="px-4 py-2 border-t flex items-center justify-between bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
        >
          <div className="flex items-center gap-4 text-detail text-text-muted">
            <span>
              <strong className="text-text-secondary">{stats.total}</strong> total
            </span>
            <span>
              <strong className="text-status-success">{stats.success_rate}%</strong> success
            </span>
            <span>
              <strong className="text-status-error">{stats.errors}</strong> errors
            </span>
          </div>
          <span className="text-caption text-text-muted">
            {stats.sessions_active} active sessions
          </span>
        </div>
      )}
    </div>
  );
});
