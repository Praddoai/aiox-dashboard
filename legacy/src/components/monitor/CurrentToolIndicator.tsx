'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import { useMonitorStore, selectCurrentTool } from '@/stores/monitor-store';

interface CurrentToolIndicatorProps {
  className?: string;
}

// Tool icons
const TOOL_ICONS: Record<string, string> = {
  Read: 'file-text',
  Write: 'file-plus',
  Edit: 'edit',
  Bash: 'terminal',
  Glob: 'search',
  Grep: 'search',
  Task: 'users',
  WebFetch: 'globe',
  WebSearch: 'search',
};

export const CurrentToolIndicator = memo(function CurrentToolIndicator({
  className,
}: CurrentToolIndicatorProps) {
  const currentTool = useMonitorStore(selectCurrentTool);
  const connected = useMonitorStore((state) => state.connected);

  if (!connected) {
    return null;
  }

  if (!currentTool) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 border rounded bg-[var(--bg-surface)] border-[var(--border-subtle)]',
          className
        )}
      >
        <span
          className="h-2 w-2 rounded-full bg-[var(--status-idle)]"
        />
        <span className="text-label text-text-muted">
          Idle
        </span>
      </div>
    );
  }

  const toolName = currentTool.tool_name || 'Unknown';
  const iconName = TOOL_ICONS[toolName] || 'circle';
  const Icon = iconMap[iconName as keyof typeof iconMap] || iconMap['circle'];

  // Get summary based on tool
  let summary = '';
  const input = currentTool.tool_input || {};
  if (toolName === 'Read' && input.file_path) {
    summary = String(input.file_path).split('/').pop() || '';
  } else if (toolName === 'Write' && input.file_path) {
    summary = String(input.file_path).split('/').pop() || '';
  } else if (toolName === 'Bash' && input.command) {
    summary = String(input.command).slice(0, 30);
  } else if (toolName === 'Grep' && input.pattern) {
    summary = `"${String(input.pattern).slice(0, 15)}"`;
  } else if (toolName === 'Glob' && input.pattern) {
    summary = String(input.pattern).slice(0, 20);
  } else if (toolName === 'Task' && input.description) {
    summary = String(input.description).slice(0, 25);
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 border rounded animate-pulse bg-[var(--accent-gold-bg)] border-[var(--accent-gold)]',
        className
      )}
    >
      {/* Spinner */}
      <div className="relative h-4 w-4">
        <div
          className="absolute inset-0 border-2 rounded-full animate-spin border-[var(--accent-gold)] border-t-transparent"
        />
      </div>

      {/* Tool info */}
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0 text-gold" />
        <span className="text-label font-medium text-gold">
          {toolName}
        </span>
        {summary && (
          <span
            className="text-detail truncate font-mono text-text-secondary"
          >
            {summary}
          </span>
        )}
      </div>
    </div>
  );
});
