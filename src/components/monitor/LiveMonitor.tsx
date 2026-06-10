import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Trash2,
  Terminal,
} from 'lucide-react';
import { GlassCard, GlassButton } from '../ui';
import { useMonitorStore, type MonitorEvent } from '../../stores/monitorStore';
import { cn } from '../../lib/utils';
import MetricsPanel from './MetricsPanel';
import EventList from './EventList';
import AgentStatusCards from './AgentStatusCards';
import AlertBanner from './AlertBanner';
import ConnectionStatus from './ConnectionStatus';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Running duration display with animated dots */
function CurrentToolIndicator({
  tool,
}: {
  tool: { name: string; startedAt: string };
}) {
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const start = new Date(tool.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, [tool.startedAt]);

  return (
    <GlassCard padding="sm" variant="subtle" className="flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-ping" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">
              Executing: {tool.name}
            </span>
            <span className="text-xs text-green-400 font-mono w-8">
              {dots.padEnd(3, '\u00A0')}
            </span>
          </div>
          <span className="text-[10px] text-tertiary">
            Running for {formatDuration(elapsed)}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}

/** Mini stat block */
function StatBlock({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className={cn('h-4 w-4', color)} />
      <span className="text-sm font-bold text-primary">{value}</span>
      <span className="text-[10px] text-tertiary">{label}</span>
    </div>
  );
}

export default function LiveMonitor({ viewToggle }: { viewToggle?: React.ReactNode }) {
  const { currentTool, stats, clearEvents, connectToMonitor, disconnectFromMonitor, alerts } =
    useMonitorStore();

  // Connect to the Monitor Server on mount
  useEffect(() => {
    connectToMonitor();

    // Seed demo data if monitor server is unavailable
    const timer = setTimeout(() => {
      const state = useMonitorStore.getState();
      if (state.events.length === 0 && !state.connected) {
        const demoEvents: MonitorEvent[] = [
          { id: 'demo-1', timestamp: new Date(Date.now() - 30000).toISOString(), type: 'tool_call', agent: '@dev', description: 'Read src/components/kanban/KanbanBoard.tsx', duration: 120, success: true },
          { id: 'demo-2', timestamp: new Date(Date.now() - 60000).toISOString(), type: 'tool_call', agent: '@dev', description: 'Edit src/stores/storyStore.ts', duration: 85, success: true },
          { id: 'demo-3', timestamp: new Date(Date.now() - 120000).toISOString(), type: 'message', agent: '@sm', description: 'Story 3.2 assigned to @dev', success: true },
          { id: 'demo-4', timestamp: new Date(Date.now() - 180000).toISOString(), type: 'tool_call', agent: '@qa', description: 'Bash: npm run test', duration: 4500, success: true },
          { id: 'demo-5', timestamp: new Date(Date.now() - 240000).toISOString(), type: 'error', agent: '@dev', description: 'TypeScript error in Charts.tsx', success: false },
          { id: 'demo-6', timestamp: new Date(Date.now() - 300000).toISOString(), type: 'tool_call', agent: '@dev', description: 'Grep "useMonitorStore" in src/', duration: 45, success: true },
          { id: 'demo-7', timestamp: new Date(Date.now() - 360000).toISOString(), type: 'system', agent: 'System', description: 'Agent @dev activated', success: true },
          { id: 'demo-8', timestamp: new Date(Date.now() - 420000).toISOString(), type: 'tool_call', agent: '@dev', description: 'Write src/components/roadmap/RoadmapView.tsx', duration: 200, success: true },
        ];
        demoEvents.forEach(e => state.addEvent(e));
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      disconnectFromMonitor();
    };
  }, [connectToMonitor, disconnectFromMonitor]);

  const hasActiveAlerts = alerts.some((a) => !a.dismissed);

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header with title + ConnectionStatus + Clear button */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-primary">Monitor</h1>
          {viewToggle}
          <ConnectionStatus />
        </div>

        <GlassButton
          size="sm"
          variant="ghost"
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={clearEvents}
        >
          Clear
        </GlassButton>
      </div>

      {/* AlertBanner (if alerts exist) */}
      {hasActiveAlerts && <AlertBanner />}

      {/* MetricsPanel */}
      <MetricsPanel />

      {/* AgentStatusCards */}
      <AgentStatusCards />

      {/* Current tool indicator */}
      {currentTool && <CurrentToolIndicator tool={currentTool} />}

      {/* EventList (replaces inline event rendering) */}
      <EventList />

      {/* Stats footer */}
      <GlassCard padding="sm" variant="subtle" className="flex-shrink-0">
        <div className="grid grid-cols-4 gap-4">
          <StatBlock
            icon={Activity}
            label="Total Events"
            value={stats.total}
            color="text-blue-400"
          />
          <StatBlock
            icon={CheckCircle2}
            label="Success Rate"
            value={`${stats.successRate}%`}
            color="text-green-400"
          />
          <StatBlock
            icon={AlertCircle}
            label="Errors"
            value={stats.errorCount}
            color="text-red-400"
          />
          <StatBlock
            icon={Wifi}
            label="Sessions"
            value={stats.activeSessions}
            color="text-cyan-400"
          />
        </div>
      </GlassCard>
    </div>
  );
}
