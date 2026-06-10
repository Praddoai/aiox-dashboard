'use client';

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AgentTask } from '@/hooks/use-squads';

interface SquadTaskCardProps {
  task: AgentTask;
}

export const SquadTaskCard = memo(function SquadTaskCard({ task }: SquadTaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'bg-card border border-border',
        'transition-luxury',
        'hover:border-border-medium',
        'w-72 shrink-0'
      )}
    >
      {/* Task Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 border-b border-border-subtle"
      >
        <div className="flex items-center justify-between">
          <span className="text-label font-medium text-text-primary truncate">
            {task.name || task.id}
          </span>
          <span className="text-caption text-text-muted ml-2 shrink-0">
            {expanded ? '−' : '+'}
          </span>
        </div>
        {task.category && (
          <span className="text-caption uppercase tracking-wider text-gold">
            {task.category}
          </span>
        )}
      </button>

      {/* Input / Output (always visible) */}
      <div className="px-4 py-2.5 space-y-2">
        {task.inputs.length > 0 && (
          <div>
            <span className="text-caption font-medium uppercase tracking-wider text-text-muted block mb-1">
              Input
            </span>
            <ul className="space-y-0.5">
              {task.inputs.slice(0, 3).map((input, i) => (
                <li key={i} className="text-detail text-text-secondary leading-snug truncate">
                  {input}
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.outputs.length > 0 && (
          <div>
            <span className="text-caption font-medium uppercase tracking-wider text-text-muted block mb-1">
              Output
            </span>
            <ul className="space-y-0.5">
              {task.outputs.slice(0, 3).map((output, i) => (
                <li key={i} className="text-detail text-text-secondary leading-snug truncate">
                  {output}
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.inputs.length === 0 && task.outputs.length === 0 && task.description && (
          <p className="text-detail text-text-muted leading-relaxed line-clamp-3">
            {task.description}
          </p>
        )}
      </div>

      {/* Expanded: Responsibilities, Anti-patterns, Tools */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2.5 border-t border-border-subtle pt-2.5">
          {task.responsibilities.length > 0 && (
            <div>
              <span className="text-caption font-medium uppercase tracking-wider text-status-success block mb-1">
                Responsibilities
              </span>
              <ul className="space-y-0.5">
                {task.responsibilities.map((r, i) => (
                  <li key={i} className="text-detail text-text-secondary leading-snug flex items-start gap-1">
                    <span className="text-text-muted shrink-0 mt-px">-</span>
                    <span className="line-clamp-2">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.antiPatterns.length > 0 && (
            <div>
              <span className="text-caption font-medium uppercase tracking-wider text-status-error block mb-1">
                Anti-patterns
              </span>
              <ul className="space-y-0.5">
                {task.antiPatterns.map((a, i) => (
                  <li key={i} className="text-detail text-text-muted leading-snug flex items-start gap-1">
                    <span className="shrink-0 mt-px">-</span>
                    <span className="line-clamp-2">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.tools.length > 0 && (
            <div>
              <span className="text-caption font-medium uppercase tracking-wider text-status-info block mb-1">
                Tools
              </span>
              <div className="flex flex-wrap gap-1">
                {task.tools.map((t, i) => (
                  <span
                    key={i}
                    className="text-caption px-1.5 py-0.5 bg-bg-elevated border border-border text-text-secondary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {task.estimatedDuration && (
            <div className="text-caption text-text-muted">
              Duration: {task.estimatedDuration}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
