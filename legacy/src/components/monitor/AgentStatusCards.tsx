'use client';

import { Card } from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-dot';
import { Badge } from '@/components/ui/badge';
import { useAgents } from '@/hooks/use-agents';

const modelMap: Record<number, string> = { 0: 'opus', 1: 'sonnet', 2: 'haiku' };

export default function AgentStatusCards() {
  const { agents, isLoading } = useAgents();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 w-24 bg-glass-5 rounded mb-2" />
            <div className="h-3 w-32 bg-glass-5 rounded mb-2" />
            <div className="h-3 w-16 bg-glass-5 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const agentCards = ((agents || []) as unknown as Array<{ id: string; name: string; tier: number }>).map((a) => ({
    id: a.id,
    name: `@${a.id} (${a.name})`,
    status: 'idle' as const,
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
      {agentCards.map((agent: { id: string; name: string; status: 'idle' | 'working' | 'waiting' | 'error' | 'success' | 'info'; task: string; duration: string; model: string }) => (
        <Card key={agent.id}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary truncate">
              {agent.name}
            </span>
            <StatusDot
              status={agent.status}
              size="sm"
              glow={agent.status === 'working'}
            />
          </div>
          <p className="text-xs text-tertiary truncate mb-2">
            {agent.task}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-tertiary font-mono">
              {agent.duration}
            </span>
            <Badge variant="secondary">
              {agent.model}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
