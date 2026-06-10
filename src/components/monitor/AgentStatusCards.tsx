import { GlassCard, StatusDot, Badge } from '../ui';
import type { StatusType } from '../ui/StatusDot';
import { useAgents } from '../../hooks/useAgents';

const modelMap: Record<number, string> = { 0: 'opus', 1: 'sonnet', 2: 'haiku' };

export default function AgentStatusCards() {
  const { data: agents, isLoading } = useAgents();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} padding="sm" variant="subtle" className="animate-pulse">
            <div className="h-4 w-24 bg-white/5 rounded mb-2" />
            <div className="h-3 w-32 bg-white/5 rounded mb-2" />
            <div className="h-3 w-16 bg-white/5 rounded" />
          </GlassCard>
        ))}
      </div>
    );
  }

  const agentCards = (agents || []).map((a) => ({
    id: `${a.squad}-${a.id}`,
    name: `@${a.id} (${a.name})`,
    status: 'idle' as StatusType,
    task: '-',
    duration: '-',
    model: modelMap[a.tier] ?? 'sonnet',
  }));

  if (agentCards.length === 0) {
    return (
      <div className="glass-subtle rounded-glass p-6 text-center">
        <p className="text-sm text-secondary">Nenhum agente encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {agentCards.map((agent) => (
        <GlassCard key={agent.id} padding="sm" variant="subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary truncate">
              {agent.name}
            </span>
            <StatusDot
              status={agent.status}
              size="sm"
              glow={agent.status === 'working'}
              pulse={agent.status === 'working'}
            />
          </div>
          <p className="text-xs text-tertiary truncate mb-2">
            {agent.task}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-tertiary font-mono">
              {agent.duration}
            </span>
            <Badge size="sm" variant="default">
              {agent.model}
            </Badge>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
