'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import { useMonitorStore } from '@/stores/monitor-store';

interface MonitorStatusProps {
  className?: string;
  showLabel?: boolean;
}

export const MonitorStatus = memo(function MonitorStatus({
  className,
  showLabel = true,
}: MonitorStatusProps) {
  const connected = useMonitorStore((state) => state.connected);
  const connecting = useMonitorStore((state) => state.connecting);
  const error = useMonitorStore((state) => state.error);
  const events = useMonitorStore((state) => state.events);

  const WifiIcon = iconMap['wifi'];
  const WifiOffIcon = iconMap['wifi-off'];
  const LoaderIcon = iconMap['loader'];

  if (connecting) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <LoaderIcon
          className="h-3 w-3 animate-spin text-text-muted"
        />
        {showLabel && (
          <span className="text-detail text-text-muted">
            Connecting...
          </span>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <WifiOffIcon className="h-3 w-3 text-status-error" />
        {showLabel && (
          <span className="text-detail text-status-error">
            Error
          </span>
        )}
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <WifiOffIcon className="h-3 w-3 text-text-muted" />
        {showLabel && (
          <span className="text-detail text-text-muted">
            Offline
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="relative">
        <WifiIcon className="h-3 w-3 text-status-success" />
        <span
          className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full animate-pulse bg-[var(--status-success)]"
        />
      </div>
      {showLabel && (
        <span className="text-detail text-status-success">
          Live
        </span>
      )}
      {events.length > 0 && (
        <span
          className="text-caption px-1 rounded text-text-muted bg-[var(--bg-hover)]"
        >
          {events.length}
        </span>
      )}
    </div>
  );
});
