'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionLabel } from '@/components/ui/section-label';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { SquadTaskCard } from './SquadTaskCard';
import { useSquadAgentDetail } from '@/hooks/use-squads';

interface SquadAgentDetailProps {
  squadName: string;
  agentId: string;
  breadcrumb?: ReactNode;
}

export function SquadAgentDetail({ squadName, agentId, breadcrumb }: SquadAgentDetailProps) {
  const { agent, isLoading, isError } = useSquadAgentDetail(squadName, agentId);
  const [viewMode, setViewMode] = useState<'overview' | 'source'>('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-label text-text-muted uppercase tracking-wider">
          Loading agent...
        </span>
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div className="p-6">
        {breadcrumb}
        <p className="text-label text-status-error">
          Failed to load agent &quot;{agentId}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Breadcrumb */}
        {breadcrumb}

        {/* Agent Header Card */}
        <div
          className={cn(
            'bg-card border border-border border-l-2 p-5 mb-8',
            'border-l-gold'
          )}
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            {agent.icon && (
              <span className="text-2xl shrink-0">{agent.icon}</span>
            )}

            <div className="flex-1 min-w-0">
              {/* Name + Title */}
              <h2 className="text-lg font-light text-text-primary">
                {agent.name}
              </h2>
              {agent.title && (
                <p className="text-label text-gold mt-0.5">
                  {agent.title}
                </p>
              )}
              {agent.role && agent.role !== agent.title && (
                <p className="text-label text-text-secondary mt-1">
                  {agent.role}
                </p>
              )}

              {/* Description */}
              {agent.description && (
                <p className="text-label text-text-muted mt-2 leading-relaxed">
                  {agent.description}
                </p>
              )}

              {/* Tier badge */}
              {agent.tier && (
                <span className="inline-block mt-2 text-caption uppercase tracking-wider px-2 py-0.5 border border-border text-text-muted">
                  {agent.tier}
                </span>
              )}
            </div>
          </div>

          {/* Tools */}
          {agent.tools.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border-subtle">
              <span className="text-caption font-medium uppercase tracking-wider text-text-muted block mb-2">
                Tools
              </span>
              <div className="flex flex-wrap gap-1.5">
                {agent.tools.map((tool, i) => (
                  <span
                    key={i}
                    className="text-detail px-2 py-0.5 bg-bg-elevated border border-border text-text-secondary"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {agent.sourceMarkdown && (
          <div className="mb-6 border-b border-border">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'px-3 py-2 text-caption uppercase tracking-wider border-b-2 -mb-px',
                viewMode === 'overview'
                  ? 'border-gold text-gold'
                  : 'border-transparent text-text-muted'
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={cn(
                'px-3 py-2 text-caption uppercase tracking-wider border-b-2 -mb-px',
                viewMode === 'source'
                  ? 'border-gold text-gold'
                  : 'border-transparent text-text-muted'
              )}
            >
              Source
            </button>
          </div>
        )}

        {viewMode === 'source' && agent.sourceMarkdown ? (
          <div className="mb-8">
            {agent.sourcePath && (
              <div className="text-caption text-text-muted font-mono mb-3">
                {agent.sourcePath}
              </div>
            )}
            <MarkdownRenderer content={agent.sourceMarkdown} />
          </div>
        ) : (
          <>
            {/* Core Principles */}
            {agent.principles.length > 0 && (
              <div className="mb-8">
                <SectionLabel withLine className="mb-3">Principles</SectionLabel>
                <ul className="space-y-1 ml-1">
                  {agent.principles.map((p, i) => (
                    <li key={i} className="text-label text-text-secondary leading-relaxed flex items-start gap-2">
                      <span className="text-gold shrink-0 mt-0.5">-</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Task Pipeline */}
            {agent.tasks.length > 0 && (
              <div className="mb-8">
                <SectionLabel withLine className="mb-4">
                  Tasks ({agent.tasks.length})
                </SectionLabel>

                <div
                  className="overflow-x-auto pb-4 -mx-2 px-2"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {agent.tasks.map((task, i) => (
                      <div key={task.id} className="flex items-start">
                        <SquadTaskCard task={task} />
                        {i < agent.tasks.length - 1 && (
                          <div className="flex items-center shrink-0 self-center px-1">
                            <svg width="24" height="12" viewBox="0 0 24 12" className="text-border">
                              <line x1="0" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5" />
                              <polyline
                                points="15,2 20,6 15,10"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Commands */}
            {agent.commands.length > 0 && (
              <div className="mb-8">
                <SectionLabel withLine className="mb-3">Commands</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {agent.commands.map((cmd, i) => (
                    <div
                      key={i}
                      className="text-detail font-mono px-2 py-1 bg-bg-elevated border border-border text-text-secondary truncate"
                    >
                      {cmd}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Handoffs */}
            {agent.handoffs.length > 0 && (
              <div className="mb-8">
                <SectionLabel withLine className="mb-3">Handoffs</SectionLabel>
                <div className="space-y-1.5">
                  {agent.handoffs.map((h, i) => (
                    <div
                      key={i}
                      className="text-label flex items-center gap-2 text-text-secondary"
                    >
                      <span className="font-mono text-gold">{h.agent}</span>
                      <span className="text-text-muted">-</span>
                      <span className="text-text-muted">{h.when}</span>
                      {h.squad && (
                        <span className="text-caption px-1.5 py-0.5 border border-border text-text-muted">
                          {h.squad}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
