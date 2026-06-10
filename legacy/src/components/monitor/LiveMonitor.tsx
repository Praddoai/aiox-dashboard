'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Trash2,
  Terminal,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMonitorStore, selectCurrentTool } from '@/stores/monitor-store';
import { cn } from '@/lib/utils';
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
function CurrentToolIndicatorInline({
  tool,
}: {
  tool: { name: string; startedAt: number };
}) {
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - tool.startedAt);
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, [tool.startedAt]);

  return (
    <Card className="flex-shrink-0">
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
    </Card>
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

export default function LiveMonitor() {
  const clearEvents = useMonitorStore((s) => s.clearEvents);
  const stats = useMonitorStore((s) => s.stats);
  const currentTool = useMonitorStore(selectCurrentTool);

  const totalEvents = stats?.total ?? 0;
  const successRate = stats?.success_rate ? parseFloat(stats.success_rate) : 100;
  const errorCount = stats?.errors ?? 0;
  const activeSessions = stats?.sessions_active ?? 0;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header with title + ConnectionStatus + Clear button */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-primary">Live Monitor</h1>
          <ConnectionStatus />
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={clearEvents}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* AlertBanner */}
      <AlertBanner />

      {/* MetricsPanel */}
      <MetricsPanel />

      {/* AgentStatusCards */}
      <AgentStatusCards />

      {/* Current tool indicator */}
      {currentTool && currentTool.tool_name && (
        <CurrentToolIndicatorInline
          tool={{ name: currentTool.tool_name, startedAt: currentTool.timestamp }}
        />
      )}

      {/* EventList */}
      <EventList />

      {/* Stats footer */}
      <Card className="flex-shrink-0">
        <div className="grid grid-cols-4 gap-4">
          <StatBlock
            icon={Activity}
            label="Total Events"
            value={totalEvents}
            color="text-blue-400"
          />
          <StatBlock
            icon={CheckCircle2}
            label="Success Rate"
            value={`${successRate}%`}
            color="text-green-400"
          />
          <StatBlock
            icon={AlertCircle}
            label="Errors"
            value={errorCount}
            color="text-red-400"
          />
          <StatBlock
            icon={Wifi}
            label="Sessions"
            value={activeSessions}
            color="text-cyan-400"
          />
        </div>
      </Card>
    </div>
  );
}
