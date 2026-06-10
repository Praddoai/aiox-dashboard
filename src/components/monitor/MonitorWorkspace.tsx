import { useState } from 'react';
import { Radio, History } from 'lucide-react';
import LiveMonitor from './LiveMonitor';
import ActivityTimeline from './ActivityTimeline';
import { cn } from '../../lib/utils';

type MonitorViewMode = 'live' | 'history';

export default function MonitorWorkspace() {
  const [viewMode, setViewMode] = useState<MonitorViewMode>('live');

  const viewToggle = (
    <div className="flex items-center rounded-lg bg-white/5 p-0.5 gap-0.5">
      <button
        onClick={() => setViewMode('live')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          viewMode === 'live'
            ? 'bg-white/10 text-primary shadow-sm'
            : 'text-tertiary hover:text-secondary'
        )}
        aria-label="Monitor ao vivo"
      >
        <Radio size={13} />
        <span className="hidden sm:inline">Live</span>
      </button>
      <button
        onClick={() => setViewMode('history')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          viewMode === 'history'
            ? 'bg-white/10 text-primary shadow-sm'
            : 'text-tertiary hover:text-secondary'
        )}
        aria-label="Histórico de atividades"
      >
        <History size={13} />
        <span className="hidden sm:inline">Histórico</span>
      </button>
    </div>
  );

  if (viewMode === 'live') {
    return <LiveMonitor viewToggle={viewToggle} />;
  }

  return <ActivityTimeline viewToggle={viewToggle} />;
}
