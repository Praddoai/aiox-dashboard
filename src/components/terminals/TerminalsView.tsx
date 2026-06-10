import { useState, useEffect } from 'react';
import { Terminal, LayoutGrid, List, Plus, ArrowLeft } from 'lucide-react';
import { GlassCard, GlassButton, Badge, ProgressBar, SectionLabel } from '../ui';
import { TerminalCard } from './TerminalCard';
import { TerminalTabs } from './TerminalTabs';
import { TerminalOutput } from './TerminalOutput';
import { useTerminalStore } from '../../stores/terminalStore';
import { mockTerminalSessions } from '../../mocks/terminals';
import { cn } from '../../lib/utils';

const agentNames = ['Dex', 'Aria', 'Pax', 'River', 'Morgan', 'Gage', 'Orion', 'Nova'];
const directories = ['~/projects/api', '~/projects/ui', '~/projects/core', '~/projects/docs'];

const MAX_SESSIONS = 12;

export default function TerminalsView() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const {
    sessions,
    activeSessionId,
    setSessions,
    setActiveSession,
    addSession,
    removeSession,
  } = useTerminalStore();

  // Load mock sessions on mount if store is empty
  useEffect(() => {
    if (sessions.length === 0) {
      setSessions(mockTerminalSessions);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionCount = sessions.length;
  const capacityPercent = Math.round((sessionCount / MAX_SESSIONS) * 100);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-primary">Terminals</h1>
          <Badge variant="default" size="sm">
            {sessionCount} sessions
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid/List toggle */}
          <div className="flex items-center glass rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-white/10 text-primary'
                  : 'text-tertiary hover:text-secondary',
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
                  ? 'bg-white/10 text-primary'
                  : 'text-tertiary hover:text-secondary',
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <GlassButton
            size="sm"
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={sessionCount >= MAX_SESSIONS}
            onClick={() => {
              const usedNames = new Set(sessions.map((s) => s.agent));
              const name = agentNames.find((n) => !usedNames.has(n)) ?? `Terminal ${sessionCount + 1}`;
              const newSession = {
                id: crypto.randomUUID(),
                agent: name,
                status: 'idle' as const,
                dir: directories[sessionCount % directories.length],
                story: '',
                output: [`$ # New terminal session — ${name}`, '$ '],
              };
              addSession(newSession);
              setActiveSession(newSession.id);
            }}
          >
            New Terminal
          </GlassButton>
        </div>
      </div>

      {/* Terminal Tabs */}
      <TerminalTabs
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={(id) =>
          setActiveSession(id === activeSessionId ? null : id)
        }
        onClose={(id) => removeSession(id)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
        {activeSession ? (
          /* Expanded terminal output for selected session */
          <GlassCard padding="none" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSession(null)}
                  className="p-1 rounded hover:bg-white/10 text-tertiary hover:text-primary transition-colors"
                  aria-label="Back to all terminals"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-primary">
                  {activeSession.agent}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeSession.story && (
                  <Badge variant="default" size="sm">{activeSession.story}</Badge>
                )}
                <span className="text-[10px] text-tertiary">{activeSession.dir}</span>
              </div>
            </div>
            <TerminalOutput
              lines={activeSession.output}
              isActive={activeSession.status === 'working'}
            />
          </GlassCard>
        ) : (
          /* Session cards grid/list */
          <div className="flex-1 overflow-y-auto" tabIndex={0} role="region" aria-label="Sessoes de terminal ativas">
            <SectionLabel count={sessionCount}>Active Sessions</SectionLabel>

            {sessions.length > 0 ? (
              <div
                className={cn(
                  'mt-3',
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3',
                )}
              >
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() => setActiveSession(session.id)}
                  >
                    <TerminalCard
                      session={session}
                      listMode={viewMode === 'list'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center mt-12">
                <GlassCard padding="lg" className="text-center max-w-sm">
                  <Terminal className="h-10 w-10 text-tertiary mx-auto mb-3" />
                  <h2 className="text-sm font-semibold text-primary mb-1">No active terminals</h2>
                  <p className="text-xs text-secondary">
                    Terminal sessions will appear here when agents start executing tasks.
                  </p>
                </GlassCard>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <GlassCard padding="sm" variant="subtle" className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-tertiary">Capacity</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-tertiary">
              {sessionCount}/{MAX_SESSIONS} sessions
            </span>
            <ProgressBar
              value={capacityPercent}
              size="sm"
              variant={capacityPercent > 80 ? 'warning' : 'default'}
              className="w-24"
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
