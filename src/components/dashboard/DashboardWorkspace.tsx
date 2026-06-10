import { useState } from 'react';
import { BarChart3, Gauge, TrendingUp } from 'lucide-react';
import { DashboardOverview } from './DashboardOverview';
import CockpitDashboard from './CockpitDashboard';
import InsightsView from '../insights/InsightsView';
import { cn } from '../../lib/utils';

type DashboardViewMode = 'default' | 'cockpit' | 'insights';

export default function DashboardWorkspace() {
  const [viewMode, setViewMode] = useState<DashboardViewMode>('default');

  const viewToggle = (
    <div className="flex items-center rounded-lg bg-white/5 p-0.5 gap-0.5">
      <button
        onClick={() => setViewMode('default')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          viewMode === 'default'
            ? 'bg-white/10 text-primary shadow-sm'
            : 'text-tertiary hover:text-secondary'
        )}
        aria-label="Dashboard padrão"
      >
        <BarChart3 size={13} />
        <span className="hidden sm:inline">Padrão</span>
      </button>
      <button
        onClick={() => setViewMode('cockpit')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          viewMode === 'cockpit'
            ? 'bg-white/10 text-primary shadow-sm'
            : 'text-tertiary hover:text-secondary'
        )}
        aria-label="Dashboard cockpit"
      >
        <Gauge size={13} />
        <span className="hidden sm:inline">Cockpit</span>
      </button>
      <button
        onClick={() => setViewMode('insights')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          viewMode === 'insights'
            ? 'bg-white/10 text-primary shadow-sm'
            : 'text-tertiary hover:text-secondary'
        )}
        aria-label="Dashboard insights"
      >
        <TrendingUp size={13} />
        <span className="hidden sm:inline">Insights</span>
      </button>
    </div>
  );

  if (viewMode === 'cockpit') {
    return <CockpitDashboard viewToggle={viewToggle} />;
  }

  if (viewMode === 'insights') {
    return <InsightsView viewToggle={viewToggle} />;
  }

  return <DashboardOverview viewToggle={viewToggle} />;
}
