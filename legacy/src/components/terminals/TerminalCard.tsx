'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import { useBobStore } from '@/stores/bob-store';
import { AGENT_CONFIG, type TerminalSession } from '@/types';

interface TerminalCardProps {
  terminal: TerminalSession;
  className?: string;
}

// Status styles using CSS variables
const STATUS_STYLES: Record<string, { bg: string; color: string; glow?: string }> = {
  idle: { bg: 'var(--status-idle)', color: 'var(--status-idle)', glow: undefined },
  running: { bg: 'var(--status-success)', color: 'var(--status-success)', glow: 'var(--status-success-glow)' },
  error: { bg: 'var(--status-error)', color: 'var(--status-error)', glow: 'var(--status-error-glow)' },
};

export const TerminalCard = memo(function TerminalCard({
  terminal,
  className,
}: TerminalCardProps) {
  const agentConfig = AGENT_CONFIG[terminal.agentId];
  const bobTerminals = useBobStore((s) => s.terminals);
  const bobActive = useBobStore((s) => s.active);
  const isBobSpawned = bobActive && bobTerminals.some((bt) => bt.agent === terminal.agentId);
  const XIcon = iconMap['close'];
  const SettingsIcon = iconMap['settings'];
  const statusStyle = STATUS_STYLES[terminal.status] || STATUS_STYLES.idle;

  return (
    <div
      className={cn(
        'border border-l-2 overflow-hidden flex flex-col font-mono text-xs h-full bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
        'transition-luxury hover:border-[rgba(255,255,255,0.08)]',
        className
      )}
      style={{
        borderLeftColor: agentConfig?.color || 'var(--border-subtle)',
      }}
    >
      {/* Terminal Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b bg-[var(--bg-surface)] border-[var(--border-subtle)]"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: statusStyle.bg,
              boxShadow: statusStyle.glow ? `0 0 8px ${statusStyle.glow}` : undefined,
            }}
          />
          <span className="font-normal text-label text-text-secondary">{terminal.name}</span>
          <span
            className="px-1.5 py-0.5 text-caption uppercase tracking-wider border"
            style={{
              color: agentConfig?.color,
              borderColor: agentConfig?.border,
              backgroundColor: agentConfig?.bg,
            }}
          >
            {terminal.agentId}
          </span>
          {isBobSpawned && (
            <span
              className="px-1.5 py-0.5 text-caption tracking-wider border"
              style={{
                color: 'var(--agent-pm)',
                borderColor: 'var(--agent-pm-border)',
                backgroundColor: 'var(--agent-pm-bg)',
              }}
            >
              Bob
            </span>
          )}
        </div>
        <div className="flex gap-2 text-text-muted">
          <button className="transition-colors p-1 hover:opacity-80">
            <SettingsIcon className="h-3 w-3" />
          </button>
          <button className="transition-colors p-1 hover:opacity-80">
            <XIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-3 space-y-1 flex-1 text-text-tertiary bg-[var(--bg-base)]">
        {/* Claude Info Header */}
        <div className="space-y-0.5 pb-2 border-b mb-2 border-[var(--border-subtle)]">
          <div className="flex gap-2 text-detail">
            <span className="text-border">*</span>
            <span className="text-border">*</span>
            <span className="text-border">*</span>
            <span className="font-normal text-text-primary">Claude Code</span>
            <span className="text-gold">v2.0</span>
          </div>
          <div className="flex gap-2 text-detail">
            <span className="text-border">*</span>
            <span className="text-border">*</span>
            <span className="text-border">*</span>
            <span className="text-text-muted">{terminal.model} • {terminal.apiType}</span>
          </div>
          <div className="flex gap-2 text-detail">
            <span className="text-border">*</span>
            <span className="text-border">*</span>
            <span className="text-border">*</span>
            <span className="text-text-muted">{terminal.workingDirectory}</span>
          </div>
        </div>

        {/* Current Command / Prompt */}
        {terminal.currentCommand ? (
          <div className="text-label text-status-success">
            <span className="mr-2 text-text-muted">{'>'}</span>
            {terminal.currentCommand}
          </div>
        ) : (
          <div className="italic text-detail text-border">Awaiting input...</div>
        )}

        {/* Story Info */}
        {terminal.storyId && (
          <div className="text-detail mt-3 pt-2 border-t border-[var(--border-subtle)]">
            <span className="uppercase tracking-wider text-text-muted">Story:</span>
            <span className="ml-2 text-text-secondary">{terminal.storyId}</span>
          </div>
        )}
      </div>

      {/* Terminal Footer - Status */}
      <div
        className="px-3 py-2 border-t flex items-center justify-between bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1 w-1 rounded-full"
            style={{
              backgroundColor: statusStyle.bg,
              boxShadow: statusStyle.glow ? `0 0 8px ${statusStyle.glow}` : undefined,
            }}
          />
          <span className="text-detail uppercase tracking-wider" style={{ color: statusStyle.color }}>
            {terminal.status}
          </span>
        </div>
        <div
          className="h-5 w-5 flex items-center justify-center text-micro font-medium border"
          style={{
            backgroundColor: agentConfig?.bg,
            borderColor: agentConfig?.border,
            color: agentConfig?.color,
          }}
        >
          {terminal.agentId.slice(0, 2).toUpperCase()}
        </div>
      </div>
    </div>
  );
});
