'use client';

import { useEffect, useRef } from 'react';
import {
  Terminal,
  MessageSquare,
  AlertTriangle,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { useMonitorStore, selectFilteredEvents } from '@/stores/monitor-store';
import type { MonitorEvent } from '@/stores/monitor-store';
import { cn } from '@/lib/utils';

// Map platform event types for display
type DisplayEventType = 'tool_call' | 'message' | 'error' | 'system';

const eventTypeConfig: Record<
  DisplayEventType,
  { icon: typeof Activity; label: string; badgeClass: string }
> = {
  tool_call: {
    icon: Terminal,
    label: 'Tool',
    badgeClass: 'bg-blue-500/15 text-blue-400',
  },
  message: {
    icon: MessageSquare,
    label: 'Message',
    badgeClass: 'bg-cyan-500/15 text-cyan-400',
  },
  error: {
    icon: AlertTriangle,
    label: 'Error',
    badgeClass: 'bg-red-500/15 text-red-400',
  },
  system: {
    icon: Settings2,
    label: 'System',
    badgeClass: 'bg-purple-500/15 text-purple-400',
  },
};

const filterTypes: DisplayEventType[] = ['tool_call', 'message', 'error', 'system'];

/** Map store EventType to display EventType */
function toDisplayType(event: MonitorEvent): DisplayEventType {
  if (event.is_error) return 'error';
  if (event.type === 'PreToolUse' || event.type === 'PostToolUse') return 'tool_call';
  if (event.type === 'UserPromptSubmit') return 'message';
  if (event.type === 'Notification') return 'message';
  return 'system';
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function EventRow({ event }: { event: MonitorEvent }) {
  const displayType = toDisplayType(event);
  const config = eventTypeConfig[displayType];
  const Icon = config.icon;

  const description = event.tool_name
    ? `${event.tool_name}${event.tool_result ? ` → ${event.tool_result.slice(0, 60)}` : ''}`
    : event.type;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-glass-5 transition-colors',
        event.is_error && 'bg-red-500/5',
      )}
    >
      <span className="text-[10px] text-tertiary font-mono whitespace-nowrap pt-0.5">
        {formatTime(event.timestamp)}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md whitespace-nowrap',
          config.badgeClass,
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
      <span className="text-xs font-medium text-secondary whitespace-nowrap">
        {event.aios_agent || event.agent || '-'}
      </span>
      <span className="text-xs text-tertiary flex-1 min-w-0 truncate">
        {description}
      </span>
      {event.duration_ms !== undefined && (
        <span className="text-[10px] text-tertiary font-mono whitespace-nowrap">
          {formatDuration(event.duration_ms)}
        </span>
      )}
      {event.is_error !== undefined &&
        (event.is_error ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
        ))}
    </motion.div>
  );
}

export default function EventList() {
  const events = useMonitorStore((s) => s.events);
  const filteredEvents = useMonitorStore(selectFilteredEvents);
  const eventTypeFilter = useMonitorStore((s) => s.eventTypeFilter);
  const setEventTypeFilter = useMonitorStore((s) => s.setEventTypeFilter);

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [filteredEvents.length]);

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <SectionLabel variant="gold">
          Activity Feed
        </SectionLabel>
        <span className="text-xs text-tertiary">({filteredEvents.length})</span>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        {filterTypes.map((type) => {
          const config = eventTypeConfig[type];
          const Icon = config.icon;
          // No direct filter by display type in store, but we can use eventTypeFilter
          const isActive = !eventTypeFilter;

          return (
            <Button
              key={type}
              size="sm"
              variant="ghost"
              className={cn(
                'text-xs',
                !isActive && 'opacity-40',
              )}
              onClick={() => setEventTypeFilter(null)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Button>
          );
        })}
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col p-0">
        <div
          ref={feedRef}
          className="flex-1 overflow-y-auto divide-y divide-glass-5"
        >
          <AnimatePresence initial={false}>
            {filteredEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </AnimatePresence>

          {filteredEvents.length === 0 && (
            <div className="flex items-center justify-center h-32 text-tertiary text-sm">
              {events.length === 0
                ? 'No events recorded'
                : 'No events match the selected filters'}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
