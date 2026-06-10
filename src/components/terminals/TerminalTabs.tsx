import { X } from 'lucide-react';
import { StatusDot } from '../ui';
import type { TerminalSession } from './TerminalCard';
import { cn } from '../../lib/utils';

interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TerminalTabs({ sessions, activeId, onSelect, onClose }: TerminalTabsProps) {
  if (sessions.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-shrink-0" role="toolbar" aria-label="Sessoes de terminal">
      {sessions.map((session) => {
        const isActive = session.id === activeId;

        return (
          <div
            key={session.id}
            role="presentation"
            className={cn(
              'flex items-center gap-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-w-0',
              isActive
                ? 'glass bg-white/10 text-primary'
                : 'text-tertiary hover:text-secondary hover:bg-white/5',
            )}
          >
            <span
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`Terminal ${session.agent}`}
              onClick={() => onSelect(session.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(session.id);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer truncate"
            >
              <StatusDot
                status={session.status}
                size="sm"
                pulse={session.status === 'working'}
              />
              <span className="truncate max-w-[120px]">{session.agent}</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(session.id);
              }}
              className="p-0.5 mr-1 rounded hover:bg-white/10 text-tertiary hover:text-secondary transition-colors"
              aria-label={`Fechar terminal ${session.agent}`}
              tabIndex={-1}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
