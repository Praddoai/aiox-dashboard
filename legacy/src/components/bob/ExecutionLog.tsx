'use client';

import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import type { ExecutionLogEntry, LogLevel } from '@/stores/executionLogStore';

const levelBadge: Record<LogLevel, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  info: { label: 'INFO', variant: 'secondary' },
  success: { label: 'SUCCESS', variant: 'default' },
  warning: { label: 'WARNING', variant: 'outline' },
  error: { label: 'ERROR', variant: 'destructive' },
  tool: { label: 'TOOL', variant: 'secondary' },
  agent: { label: 'AGENT', variant: 'outline' },
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
        <p className="text-sm text-muted-foreground">No log entries yet</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-64 overflow-y-auto space-y-1 rounded-xl bg-muted/30 p-3"
    >
      {entries.map((entry) => {
        const badge = levelBadge[entry.level] || levelBadge.info;
        return (
          <div key={entry.id} className="flex items-start gap-2 py-1">
            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 pt-0.5 w-16">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Badge variant={badge.variant} className="flex-shrink-0 text-[10px]">
              {badge.label}
            </Badge>
            {entry.agentName && (
              <span className="text-[11px] text-muted-foreground flex-shrink-0">{entry.agentName}</span>
            )}
            <span className="text-xs text-foreground truncate">{entry.message}</span>
          </div>
        );
      })}
    </div>
  );
}
