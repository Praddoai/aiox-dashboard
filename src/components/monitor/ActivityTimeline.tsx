import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Terminal,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { GlassCard } from '../ui';
import { useMonitorStore, type MonitorEvent } from '../../stores/monitorStore';
import { useExecutionHistory } from '../../hooks/useExecute';
import { cn } from '../../lib/utils';

type ActivityType = 'execution' | 'tool_call' | 'message' | 'error' | 'system';

interface TimelineItem {
  id: string;
  timestamp: string;
  type: ActivityType;
  title: string;
  description?: string;
  status?: 'success' | 'error' | 'pending';
  agent?: string;
}

const typeConfig: Record<ActivityType, { icon: typeof Activity; color: string }> = {
  execution: { icon: CheckCircle, color: 'text-green-400' },
  tool_call: { icon: Terminal, color: 'text-blue-400' },
  message: { icon: MessageSquare, color: 'text-cyan-400' },
  error: { icon: AlertTriangle, color: 'text-red-400' },
  system: { icon: Activity, color: 'text-purple-400' },
};

function formatTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Demo data shown when no real data is available
function generateDemoData(): TimelineItem[] {
  const now = Date.now();
  const min = 60_000;
  const hour = 3_600_000;

  return [
    { id: 'demo-1', timestamp: new Date(now - 2 * min).toISOString(), type: 'execution', title: 'Story 3.2 — Build completed', agent: '@dev', status: 'success' },
    { id: 'demo-2', timestamp: new Date(now - 5 * min).toISOString(), type: 'tool_call', title: 'Read src/components/kanban/KanbanBoard.tsx', agent: '@dev', status: 'success' },
    { id: 'demo-3', timestamp: new Date(now - 8 * min).toISOString(), type: 'tool_call', title: 'Edit src/stores/storyStore.ts', agent: '@dev', status: 'success' },
    { id: 'demo-4', timestamp: new Date(now - 12 * min).toISOString(), type: 'message', title: 'Story 3.2 assigned to @dev', agent: '@sm' },
    { id: 'demo-5', timestamp: new Date(now - 18 * min).toISOString(), type: 'system', title: 'QA Gate passed — Story 3.1', agent: '@qa', status: 'success' },
    { id: 'demo-6', timestamp: new Date(now - 25 * min).toISOString(), type: 'error', title: 'TypeScript error in Charts.tsx:176', agent: '@dev', status: 'error', description: 'Expected ")" but found "{"' },
    { id: 'demo-7', timestamp: new Date(now - 30 * min).toISOString(), type: 'tool_call', title: 'Grep "useMonitorStore" in src/', agent: '@dev', status: 'success' },
    { id: 'demo-8', timestamp: new Date(now - 45 * min).toISOString(), type: 'execution', title: 'npm run test — 42 passed, 0 failed', agent: '@qa', status: 'success' },
    { id: 'demo-9', timestamp: new Date(now - 1 * hour).toISOString(), type: 'message', title: 'Story 3.1 validated — GO (score 9/10)', agent: '@po' },
    { id: 'demo-10', timestamp: new Date(now - 1.5 * hour).toISOString(), type: 'tool_call', title: 'Write src/components/roadmap/RoadmapView.tsx', agent: '@dev', status: 'success' },
    { id: 'demo-11', timestamp: new Date(now - 2 * hour).toISOString(), type: 'system', title: 'Agent @architect activated', agent: '@aios-master' },
    { id: 'demo-12', timestamp: new Date(now - 2.5 * hour).toISOString(), type: 'execution', title: 'npm run lint — 0 warnings', agent: '@dev', status: 'success' },
    { id: 'demo-13', timestamp: new Date(now - 3 * hour).toISOString(), type: 'error', title: 'Connection timeout to monitor service', agent: 'System', status: 'error', description: 'Retrying in 5s...' },
    { id: 'demo-14', timestamp: new Date(now - 4 * hour).toISOString(), type: 'message', title: 'Epic 3 — Sprint planning completed', agent: '@pm' },
    { id: 'demo-15', timestamp: new Date(now - 5 * hour).toISOString(), type: 'tool_call', title: 'Bash: git commit -m "feat: add kanban filters"', agent: '@dev', status: 'success' },
    // Yesterday
    { id: 'demo-16', timestamp: new Date(now - 26 * hour).toISOString(), type: 'execution', title: 'Full build — production bundle', agent: '@devops', status: 'success' },
    { id: 'demo-17', timestamp: new Date(now - 27 * hour).toISOString(), type: 'system', title: 'Deploy to staging — v0.4.2', agent: '@devops', status: 'success' },
    { id: 'demo-18', timestamp: new Date(now - 28 * hour).toISOString(), type: 'tool_call', title: 'Read docs/stories/2.3.story.md', agent: '@sm', status: 'success' },
    { id: 'demo-19', timestamp: new Date(now - 30 * hour).toISOString(), type: 'message', title: 'Code review approved — PR #47', agent: '@qa' },
    { id: 'demo-20', timestamp: new Date(now - 32 * hour).toISOString(), type: 'error', title: 'Test failure: notificationPrefsStore.test.ts', agent: '@qa', status: 'error', description: 'Expected true, received false' },
  ];
}

export default function ActivityTimeline({ viewToggle }: { viewToggle?: React.ReactNode }) {
  const monitorEvents = useMonitorStore((s) => s.events);
  const { data: historyData } = useExecutionHistory(50);
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');

  const items = useMemo(() => {
    const timeline: TimelineItem[] = [];

    // Add monitor events
    monitorEvents.forEach((e: MonitorEvent) => {
      timeline.push({
        id: e.id,
        timestamp: e.timestamp,
        type: e.type === 'tool_call' ? 'tool_call' : e.type === 'message' ? 'message' : e.type === 'error' ? 'error' : 'system',
        title: e.description,
        agent: e.agent,
        status: e.success === false ? 'error' : e.success === true ? 'success' : undefined,
      });
    });

    // Add execution history
    if (historyData?.executions) {
      historyData.executions.slice(0, 30).forEach((e) => {
        timeline.push({
          id: `exec-${e.id}`,
          timestamp: e.createdAt || new Date().toISOString(),
          type: e.status === 'failed' ? 'error' : 'execution',
          title: `${e.agentId || 'Execution'} — ${e.status}`,
          description: e.agentId ? `Agent: ${e.agentId}` : undefined,
          agent: e.agentId || undefined,
          status: e.status === 'completed' ? 'success' : e.status === 'failed' ? 'error' : 'pending',
        });
      });
    }

    // Fallback to demo data when no real data is available
    if (timeline.length === 0) {
      return generateDemoData();
    }

    // Sort by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return timeline;
  }, [monitorEvents, historyData]);

  const isDemo = monitorEvents.length === 0 && !historyData?.executions?.length;
  const filtered = filterType === 'all' ? items : items.filter((i) => i.type === filterType);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};
    filtered.forEach((item) => {
      const date = new Date(item.timestamp);
      const today = new Date();
      let label: string;
      if (date.toDateString() === today.toDateString()) {
        label = 'Hoje';
      } else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        label = date.toDateString() === yesterday.toDateString()
          ? 'Ontem'
          : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="h-full overflow-y-auto glass-scrollbar p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={22} className="text-blue-400" />
          <h1 className="text-xl font-semibold text-primary">Monitor</h1>
          {viewToggle}
          <span className="text-xs text-tertiary">({items.length} eventos)</span>
          {isDemo && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
              Demo
            </span>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'execution', 'tool_call', 'message', 'error', 'system'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filterType === type
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-tertiary hover:text-primary border border-transparent'
            )}
          >
            {type === 'all' ? 'Todos' : type === 'tool_call' ? 'Tools' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {Object.keys(grouped).length === 0 ? (
        <GlassCard padding="md">
          <div className="text-center py-12 text-tertiary">
            <Clock size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma atividade registrada</p>
            <p className="text-xs mt-1">Eventos aparecerão aqui conforme o sistema opera</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dateItems]) => (
            <div key={dateLabel}>
              <div className="text-[10px] text-tertiary uppercase tracking-wider mb-3 px-1">{dateLabel}</div>
              <div className="relative pl-6 border-l border-glass-border space-y-1">
                {dateItems.map((item, idx) => {
                  const config = typeConfig[item.type];
                  const Icon = config.icon;
                  const StatusIcon = item.status === 'error' ? XCircle : item.status === 'success' ? CheckCircle : Clock;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="relative flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'absolute -left-[31px] top-3 w-3 h-3 rounded-full border-2 border-[var(--color-background)]',
                          item.status === 'error' ? 'bg-red-400' : item.status === 'success' ? 'bg-green-400' : 'bg-white/30'
                        )}
                      />

                      <Icon size={14} className={cn('mt-0.5 flex-shrink-0', config.color)} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.agent && <span className="text-[10px] text-secondary">{item.agent}</span>}
                          <span className="text-[10px] text-tertiary">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                      </div>

                      {item.status && (
                        <StatusIcon
                          size={12}
                          className={cn(
                            'flex-shrink-0 mt-1',
                            item.status === 'error' ? 'text-red-400' : item.status === 'success' ? 'text-green-400' : 'text-tertiary'
                          )}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
