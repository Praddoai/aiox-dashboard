import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  MessageSquare,
  AlertOctagon,
  Settings,
  Trash2,
} from 'lucide-react';
import { GlassCard, GlassButton, Badge } from '../ui';
import { cn } from '../../lib/utils';
import { useMonitorStore, type MonitorEvent } from '../../stores/monitorStore';

const typeConfig: Record<MonitorEvent['type'], { icon: typeof Settings; color: string; label: string }> = {
  system: { icon: Settings, color: 'text-blue-400', label: 'System' },
  message: { icon: MessageSquare, color: 'text-green-400', label: 'Message' },
  error: { icon: AlertOctagon, color: 'text-red-400', label: 'Error' },
  tool_call: { icon: Wrench, color: 'text-yellow-400', label: 'Tool' },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function EngineEventFeed() {
  const events = useMonitorStore((s) => s.events);
  const connected = useMonitorStore((s) => s.connected);
  const clearEvents = useMonitorStore((s) => s.clearEvents);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  // Show events newest-last (chronological)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              connected ? 'bg-green-400 animate-pulse' : 'bg-red-400',
            )}
          />
          <span className="text-xs text-tertiary">
            {connected ? 'WebSocket conectado' : 'Desconectado'}
          </span>
          <Badge variant="default" className="text-[10px]">
            {events.length} eventos
          </Badge>
        </div>
        {events.length > 0 && (
          <GlassButton
            size="sm"
            variant="ghost"
            leftIcon={<Trash2 className="h-3 w-3" />}
            onClick={clearEvents}
          >
            Limpar
          </GlassButton>
        )}
      </div>

      {/* Event list */}
      {sortedEvents.length === 0 ? (
        <div className="text-tertiary text-sm p-8 text-center">
          {connected
            ? 'Aguardando eventos do engine...'
            : 'Conecte ao engine para ver eventos em tempo real'}
        </div>
      ) : (
        <div ref={scrollRef} className="space-y-1 max-h-[60vh] overflow-auto">
          <AnimatePresence initial={false}>
            {sortedEvents.map((event) => {
              const config = typeConfig[event.type] || typeConfig.system;
              const Icon = config.icon;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <GlassCard
                    padding="sm"
                    variant="subtle"
                    className={cn(
                      event.type === 'error' && 'border-l-2 border-red-500/40',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', config.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-primary">
                            {event.agent}
                          </span>
                          <Badge variant="default" className="text-[9px]">
                            {config.label}
                          </Badge>
                          {event.duration !== undefined && (
                            <span className="text-[10px] text-tertiary">
                              {event.duration}ms
                            </span>
                          )}
                          {event.success === false && (
                            <span className="text-[10px] text-red-400">FAILED</span>
                          )}
                        </div>
                        <div className="text-xs text-secondary mt-0.5 break-words">
                          {event.description}
                        </div>
                      </div>
                      <span className="text-[10px] text-tertiary flex-shrink-0">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
