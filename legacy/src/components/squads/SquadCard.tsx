'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Users, FileText, GitBranch, CheckCircle2 } from 'lucide-react';
import { getDomainColor } from '@/lib/domain-taxonomy';
import { formatSquadScore, formatSquadVersion, getScoreColor } from '@/lib/squad-metadata';
import type { Squad } from '@/types';

interface SquadCardProps {
  squad: Squad;
  onClick?: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const color = getScoreColor(score);
  const pct = (score / 10) * 100;
  const circ = 2 * Math.PI * 12;
  const offset = circ - (pct / 100) * circ;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 w-8 h-8"
      title={`Score: ${formatSquadScore(score)}/10`}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
        <circle cx="16" cy="16" r="12" fill="none" stroke="var(--border-subtle)" strokeWidth="2.5" />
        <circle
          cx="16" cy="16" r="12"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span
        className="absolute text-caption font-mono font-medium"
        style={{ color }}
      >
        {formatSquadScore(score)}
      </span>
    </div>
  );
}

export const SquadCard = memo(function SquadCard({ squad, onClick }: SquadCardProps) {
  const domainColor = getDomainColor(squad.domain);
  const showBadge = squad.status !== 'active';

  return (
    <div
      data-squad={squad.name}
      onClick={onClick}
      className={cn(
        'group relative',
        'bg-card border border-border border-l-2',
        'transition-luxury hover-lift',
        'hover:bg-card-hover hover:border-border-medium',
        'cursor-pointer'
      )}
      style={{ borderLeftColor: domainColor }}
    >
      <div className="p-4">
        {/* Header: Name + Score ring */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-sm font-light text-text-primary truncate">
              {squad.displayName}
            </span>
            {showBadge && (
              <span className="text-caption uppercase tracking-wider font-medium px-1.5 py-px border border-status-warning text-status-warning shrink-0">
                {squad.status}
              </span>
            )}
          </div>
          <ScoreRing score={squad.score} />
        </div>

        {/* Description */}
        {squad.description && (
          <p className="text-label text-text-secondary line-clamp-2 leading-relaxed mt-2 mb-3">
            {squad.description}
          </p>
        )}

        {/* Stats: icon + number, no text labels */}
        <div className="flex items-center gap-3 text-detail text-text-muted">
          <span className="flex items-center gap-1" title="Agents">
            <Users className="h-3 w-3" />
            <span className="font-mono text-text-tertiary">{squad.agentCount}</span>
          </span>
          <span className="flex items-center gap-1" title="Tasks">
            <FileText className="h-3 w-3" />
            <span className="font-mono text-text-tertiary">{squad.taskCount}</span>
          </span>
          {squad.workflowCount > 0 && (
            <span className="flex items-center gap-1" title="Workflows">
              <GitBranch className="h-3 w-3" />
              <span className="font-mono text-text-tertiary">{squad.workflowCount}</span>
            </span>
          )}
          {squad.checklistCount > 0 && (
            <span className="flex items-center gap-1" title="Checklists">
              <CheckCircle2 className="h-3 w-3" />
              <span className="font-mono text-text-tertiary">{squad.checklistCount}</span>
            </span>
          )}

          {/* Version - right-aligned, subdued */}
          <span
            className="ml-auto text-text-disabled font-mono opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Version ${formatSquadVersion(squad.version)}`}
          >
            {formatSquadVersion(squad.version)}
          </span>
        </div>
      </div>
    </div>
  );
});
