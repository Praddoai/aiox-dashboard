import { memo } from 'react';
import { Bot, Clock, AlertTriangle } from 'lucide-react';
import { GlassCard, Badge, ProgressBar, Avatar } from '../ui';
import type { StatusType } from '../ui/StatusDot';
import { cn, formatRelativeTime } from '../../lib/utils';

export interface AgentMonitorData {
  id: string;
  name: string;
  status: 'working' | 'waiting' | 'idle' | 'error';
  phase: string;
  progress: number;
  story: string;
  lastActivity: string;
  model: string;
  squad?: string;
  totalExecutions?: number;
  successRate?: number;
  avgResponseTime?: number;
}

const phaseColors: Record<string, string> = {
  coding: 'text-green-400',
  testing: 'text-purple-400',
  reviewing: 'text-orange-400',
  planning: 'text-blue-400',
  deploying: 'text-yellow-400',
};

const modelBadgeStyle: Record<string, string> = {
  opus: 'bg-purple-500/15 text-purple-400',
  sonnet: 'bg-blue-500/15 text-blue-400',
  haiku: 'bg-green-500/15 text-green-400',
};

const statusBorderColor: Record<AgentMonitorData['status'], string> = {
  working: 'border-l-green-500',
  waiting: 'border-l-blue-500',
  idle: 'border-l-gray-500/30',
  error: 'border-l-red-500',
};

function mapStatus(status: AgentMonitorData['status']): StatusType {
  return status;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isStale(lastActivity: string): boolean {
  if (!lastActivity || lastActivity === '-') return false;
  return Date.now() - new Date(lastActivity).getTime() > STALE_THRESHOLD_MS;
}

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface AgentMonitorCardProps {
  agent: AgentMonitorData;
  onClick?: () => void;
}

export const AgentMonitorCard = memo(function AgentMonitorCard({
  agent,
  onClick,
}: AgentMonitorCardProps) {
  const isActive = agent.status === 'working';
  const isError = agent.status === 'error';
  const stale = isStale(agent.lastActivity);
  const _statusType = mapStatus(agent.status);
  const relativeTime =
    agent.lastActivity && agent.lastActivity !== '-'
      ? formatRelativeTime(agent.lastActivity)
      : '-';

  return (
    <GlassCard
      padding="md"
      className={cn(
        'relative overflow-hidden border-l-[3px] transition-all duration-200',
        statusBorderColor[agent.status],
        isActive && 'ring-1 ring-green-500/20',
        isError && 'ring-1 ring-red-500/20',
        onClick && 'cursor-pointer hover:bg-white/[0.03]',
      )}
      onClick={onClick}
      aria-label={`Agent ${agent.name} - ${agent.status}`}
    >
      {/* Header: avatar + name + status + model */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            name={agent.name}
            agentId={agent.id}
            size="sm"
            status={isActive ? 'online' : isError ? 'busy' : undefined}
          />
          <span className="text-sm font-semibold text-primary truncate">
            {agent.name}
          </span>
          {stale && (
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
          )}
        </div>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md flex-shrink-0',
            modelBadgeStyle[agent.model] ?? 'bg-gray-500/15 text-gray-400',
          )}
        >
          {agent.model}
        </span>
      </div>

      {/* Phase */}
      {agent.phase && (
        <div className="flex items-center gap-1.5 mb-3">
          <Bot className="h-3.5 w-3.5 text-tertiary flex-shrink-0" />
          <span
            className={cn(
              'text-xs font-medium capitalize',
              phaseColors[agent.phase] ?? 'text-secondary',
            )}
          >
            {agent.phase}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {(isActive || isError) && agent.progress > 0 && (
        <ProgressBar
          value={agent.progress}
          size="sm"
          variant={isError ? 'error' : 'success'}
          glow={isActive}
          showLabel
          className="mb-3"
        />
      )}

      {/* Performance mini-stats */}
      {(agent.totalExecutions !== undefined || agent.successRate !== undefined) && (
        <div className="flex items-center gap-3 mb-3 text-[10px] text-tertiary">
          {agent.totalExecutions !== undefined && (
            <span>{agent.totalExecutions} execs</span>
          )}
          {agent.successRate !== undefined && (
            <span
              className={cn(
                agent.successRate >= 95
                  ? 'text-green-400'
                  : agent.successRate >= 80
                    ? 'text-yellow-400'
                    : 'text-red-400',
              )}
            >
              {agent.successRate}% success
            </span>
          )}
          {agent.avgResponseTime !== undefined && (
            <span>{formatDurationMs(agent.avgResponseTime)} avg</span>
          )}
        </div>
      )}

      {/* Footer: story + last activity */}
      <div className="flex items-center justify-between">
        {agent.story ? (
          <Badge variant="default" size="sm">
            {agent.story}
          </Badge>
        ) : (
          <span className="text-[10px] text-tertiary">No active story</span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px]',
            stale ? 'text-yellow-500' : 'text-tertiary',
          )}
        >
          <Clock className="h-3 w-3" />
          {relativeTime}
        </span>
      </div>
    </GlassCard>
  );
});
