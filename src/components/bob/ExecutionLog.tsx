import { useEffect, useRef } from 'react';
import { Badge } from '../ui';
import type { ExecutionLogEntry } from '../../stores/bobStore';

const typeBadge: Record<ExecutionLogEntry['type'], { label: string; status: 'online' | 'success' | 'warning' | 'error' }> = {
  info: { label: 'INFO', status: 'online' },
  action: { label: 'ACTION', status: 'success' },
  decision: { label: 'DECISION', status: 'warning' },
  error: { label: 'ERROR', status: 'error' },
};

export default function ExecutionLog({ entries }: { entries: ExecutionLogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-tertiary">No log entries yet</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-64 overflow-y-auto space-y-1 rounded-xl glass-subtle p-3"
      tabIndex={0}
      role="region"
      aria-label="Log de execucao"
    >
      {entries.map((entry) => {
        const badge = typeBadge[entry.type];
        return (
          <div key={entry.id} className="flex items-start gap-2 py-1">
            <span className="text-[10px] font-mono text-tertiary flex-shrink-0 pt-0.5 w-16">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Badge variant="status" status={badge.status} size="sm" className="flex-shrink-0">
              {badge.label}
            </Badge>
            <span className="text-[11px] text-secondary flex-shrink-0">{entry.agent}</span>
            <span className="text-xs text-primary truncate">{entry.message}</span>
          </div>
        );
      })}
    </div>
  );
}
