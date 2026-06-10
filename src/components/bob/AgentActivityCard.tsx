import { Bot } from 'lucide-react';
import { GlassCard, StatusDot } from '../ui';
import type { BobAgent } from '../../stores/bobStore';
import { cn } from '../../lib/utils';

const statusBorder: Record<BobAgent['status'], string> = {
  working: 'border-l-green-500',
  waiting: 'border-l-blue-500',
  completed: 'border-l-gray-500',
  failed: 'border-l-red-500',
};

const statusDotMap: Record<BobAgent['status'], { dot: 'working' | 'success' | 'waiting' | 'error'; label: string }> = {
  working: { dot: 'working', label: 'Working' },
  completed: { dot: 'success', label: 'Done' },
  waiting: { dot: 'waiting', label: 'Waiting' },
  failed: { dot: 'error', label: 'Failed' },
};

export default function AgentActivityCard({
  agent,
  isCurrent = false,
}: {
  agent: BobAgent;
  isCurrent?: boolean;
}) {
  const mapped = statusDotMap[agent.status];

  return (
    <GlassCard
      padding="sm"
      className={cn(
        'border-l-[3px]',
        statusBorder[agent.status],
        isCurrent && 'ring-2 ring-blue-500/30 animate-pulse',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 text-tertiary flex-shrink-0" />
          <span className="text-sm font-medium text-primary truncate">{agent.name}</span>
        </div>
        <StatusDot
          status={mapped.dot}
          size="sm"
          glow={agent.status === 'working'}
          pulse={agent.status === 'working'}
          label={mapped.label}
        />
      </div>
      <p className="text-xs text-secondary mt-1.5 truncate">{agent.task}</p>
    </GlassCard>
  );
}
