'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { iconMap, AlertTriangle } from '@/lib/icons';
import { StatusDot, type StatusType as DotStatusType } from '@/components/ui/status-dot';
import { ProgressBar } from '@/components/ui/progress-bar';
import { AGENT_CONFIG, type Agent } from '@/types';

// Phase labels with colors using CSS variables
const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: 'var(--phase-planning)' },
  coding: { label: 'Coding', color: 'var(--phase-coding)' },
  testing: { label: 'Testing', color: 'var(--phase-testing)' },
  reviewing: { label: 'Reviewing', color: 'var(--phase-reviewing)' },
  deploying: { label: 'Deploying', color: 'var(--phase-deploying)' },
};

// Map agent status to StatusDot type
const STATUS_TO_DOT: Record<string, DotStatusType> = {
  idle: 'idle',
  working: 'working',
  waiting: 'waiting',
  error: 'error',
};

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

function getRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function isStale(timestamp: string): boolean {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  return minutes > 5;
}

export const AgentCard = memo(function AgentCard({
  agent,
  onClick,
}: AgentCardProps) {
  const isActive = agent.status !== 'idle';
  const stale = agent.lastActivity && isStale(agent.lastActivity);
  const phaseConfig = agent.phase ? PHASE_CONFIG[agent.phase] : null;
  const dotStatus = STATUS_TO_DOT[agent.status] || 'idle';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-4',
        'bg-card border border-border border-l-2',
        'transition-luxury hover-lift',
        'hover:bg-card-hover hover:border-border-medium',
        'cursor-pointer'
      )}
      style={{ borderLeftColor: isActive ? agent.color : 'var(--border)' }}
    >
      {/* Header: Status dot + Icon + Name */}
      <div className="flex items-center gap-3 mb-4">
        <StatusDot status={dotStatus} size="lg" glow={isActive} />
        <div className="flex items-center gap-2 flex-1">
          {(() => {
            const IconComponent = iconMap[agent.icon];
            return IconComponent ? (
              <IconComponent
                className={cn("h-4 w-4 transition-colors", !isActive && "text-text-muted")}
                style={isActive ? { color: agent.color } : undefined}
              />
            ) : null;
          })()}
          <span className={cn(
            "font-light text-sm transition-colors",
            isActive ? "text-text-primary" : "text-text-tertiary"
          )}>
            @{agent.id}
          </span>
        </div>

        {/* Status badge */}
        <span
          className="text-caption uppercase tracking-wider font-medium px-2 py-0.5 border"
          style={{
            backgroundColor: isActive ? AGENT_CONFIG[agent.id]?.bg : 'var(--border)',
            borderColor: isActive ? AGENT_CONFIG[agent.id]?.border : 'var(--border)',
            color: isActive ? agent.color : 'var(--text-muted)',
          }}
        >
          {agent.status}
        </span>
      </div>

      {/* Active agent details */}
      {isActive && (
        <div className="space-y-3">
          {/* Current Story */}
          {agent.currentStoryId && (
            <div className="flex items-center justify-between">
              <span className="text-detail uppercase tracking-wider text-text-muted">Story</span>
              <span className="text-label font-mono text-text-secondary">{agent.currentStoryId}</span>
            </div>
          )}

          {/* Phase */}
          {phaseConfig && (
            <div className="flex items-center justify-between">
              <span className="text-detail uppercase tracking-wider text-text-muted">Phase</span>
              <span
                className="text-label font-medium"
                style={{ color: phaseConfig.color }}
              >
                {phaseConfig.label}
              </span>
            </div>
          )}

          {/* Progress bar */}
          {typeof agent.progress === 'number' && (
            <div className="pt-2 border-t border-border-subtle">
              <div className="flex items-center justify-between text-detail mb-2">
                <span className="uppercase tracking-wider text-text-muted">Progress</span>
                <span className="font-mono text-text-secondary">{agent.progress}%</span>
              </div>
              <ProgressBar
                progress={agent.progress}
                color={agent.color}
                glow
              />
            </div>
          )}

          {/* Last activity */}
          {agent.lastActivity && (
            <div
              className={cn(
                'flex items-center gap-1.5 pt-2 border-t border-border-subtle',
                'text-detail',
                stale ? 'text-status-warning' : 'text-text-muted'
              )}
            >
              {stale && <AlertTriangle className="h-3 w-3" />}
              <span className="uppercase tracking-wider">Last active:</span>
              <span className="text-text-tertiary">{getRelativeTime(agent.lastActivity)}</span>
            </div>
          )}
        </div>
      )}

      {/* Idle state */}
      {!isActive && (
        <div className="text-label text-text-muted font-light">
          {agent.name} is standing by
        </div>
      )}
    </div>
  );
});
