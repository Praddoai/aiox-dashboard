'use client';

import { X } from 'lucide-react';
import type { Terminal } from '@/stores/terminal-store';
import { AGENT_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

interface TerminalTabsProps {
  terminals: Terminal[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

const statusColors: Record<string, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500',
  disconnected: 'bg-muted-foreground',
  error: 'bg-red-500',
};

export function TerminalTabs({ terminals, activeId, onSelect, onClose }: TerminalTabsProps) {
  if (terminals.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-shrink-0">
      {terminals.map((terminal) => {
        const isActive = terminal.id === activeId;
        const agentName = (AGENT_CONFIG as Record<string, { name: string }>)[terminal.agentId]?.name || terminal.agentId;

        return (
          <button
            key={terminal.id}
            onClick={() => onSelect(terminal.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-w-0',
              isActive
                ? 'bg-accent text-foreground border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
            aria-label={`Terminal ${agentName}`}
            aria-selected={isActive}
            role="tab"
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                statusColors[terminal.status] || statusColors.disconnected,
                terminal.status === 'connecting' && 'animate-pulse',
              )}
            />
            <span className="truncate max-w-[120px]">{agentName}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClose(terminal.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onClose(terminal.id);
                }
              }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Close terminal ${agentName}`}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
