'use client';

import { useState } from 'react';
import { Terminal as TerminalIcon, LayoutGrid, List, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TerminalCard } from './TerminalCard';
import { TerminalTabs } from './TerminalTabs';
import { TerminalOutput } from './TerminalOutput';
import { useTerminalStore, type Terminal } from '@/stores/terminal-store';
import { AGENT_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

const MAX_TERMINALS = 12;

export function TerminalsView() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const terminals = useTerminalStore((s) => s.terminals);
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId);
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal);
  const removeTerminal = useTerminalStore((s) => s.removeTerminal);
  const createTerminal = useTerminalStore((s) => s.createTerminal);

  const terminalList = Object.values(terminals);
  const terminalCount = terminalList.length;
  const capacityPercent = Math.round((terminalCount / MAX_TERMINALS) * 100);
  const activeTerminal = activeTerminalId ? terminals[activeTerminalId] ?? null : null;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <TerminalIcon className="h-5 w-5 text-foreground" />
          <h1 className="text-lg font-bold text-foreground">Terminals</h1>
          <Badge variant="outline">
            {terminalCount} sessions
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid/List toggle */}
          <div className="flex items-center border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => createTerminal('main')}
            disabled={terminalCount >= MAX_TERMINALS}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Terminal
          </Button>
        </div>
      </div>

      {/* Terminal Tabs */}
      <TerminalTabs
        terminals={terminalList}
        activeId={activeTerminalId}
        onSelect={(id) =>
          setActiveTerminal(id === activeTerminalId ? null : id)
        }
        onClose={(id) => removeTerminal(id)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
        {activeTerminal ? (
          /* Expanded terminal output for selected terminal */
          <Card className="flex-1 flex flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
              <span className="text-sm font-semibold text-foreground">
                {(AGENT_CONFIG as Record<string, { name: string }>)[activeTerminal.agentId]?.name || activeTerminal.agentId}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {activeTerminal.status}
                </Badge>
              </div>
            </div>
            <TerminalOutput />
          </Card>
        ) : (
          /* Terminal cards grid/list */
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Active Terminals
              <Badge variant="outline" className="ml-2">{terminalCount}</Badge>
            </h3>

            {terminalList.length > 0 ? (
              <div
                className={cn(
                  'mt-3',
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3',
                )}
              >
                {terminalList.map((terminal) => (
                  <div
                    key={terminal.id}
                    className="cursor-pointer"
                    onClick={() => setActiveTerminal(terminal.id)}
                  >
                    <TerminalCard terminal={terminal as any} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center mt-12">
                <Card className="text-center max-w-sm p-6">
                  <TerminalIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h2 className="text-sm font-semibold text-foreground mb-1">No active terminals</h2>
                  <p className="text-xs text-muted-foreground">
                    Terminal sessions will appear here when agents start executing tasks.
                  </p>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <Card className="flex-shrink-0 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Capacity</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {terminalCount}/{MAX_TERMINALS} terminals
            </span>
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  capacityPercent > 80 ? 'bg-yellow-500' : 'bg-primary'
                )}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
