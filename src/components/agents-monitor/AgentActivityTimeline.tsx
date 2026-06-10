import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '../ui';
import { GlassCard } from '../ui';
import type { AgentActivityEntry } from '../../types';

interface AgentActivityTimelineProps {
  entries: AgentActivityEntry[];
  agentFilter?: string | null;
  maxEntries?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AgentActivityTimeline({
  entries,
  agentFilter,
  maxEntries = 20,
}: AgentActivityTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = agentFilter
    ? entries.filter((e) => e.agentId === agentFilter)
    : entries;
  const visible = filtered.slice(0, maxEntries);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [agentFilter]);

  if (visible.length === 0) {
    return (
      <GlassCard padding="md" variant="subtle">
        <div className="text-center py-4">
          <Clock className="h-6 w-6 text-tertiary mx-auto mb-2" />
          <p className="text-sm text-secondary">Nenhuma atividade recente</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-1" tabIndex={0} role="region" aria-label="Linha do tempo de atividades dos agentes">
      {visible.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
          className="flex items-center gap-2 glass-subtle rounded-lg px-3 py-2"
        >
          {/* Status icon */}
          {entry.status === 'success' ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
          )}

          {/* Agent badge (only if not filtered) */}
          {!agentFilter && (
            <Badge variant="default" size="sm" className="flex-shrink-0">
              @{entry.agentId}
            </Badge>
          )}

          {/* Action */}
          <span className="text-xs text-primary truncate flex-1">
            {entry.action}
          </span>

          {/* Duration */}
          <span className="text-[10px] text-tertiary flex-shrink-0">
            {formatDuration(entry.duration)}
          </span>

          {/* Timestamp */}
          <span className="text-[10px] font-mono text-tertiary flex-shrink-0 w-16 text-right">
            {formatTime(entry.timestamp)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
