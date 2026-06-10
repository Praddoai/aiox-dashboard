import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Zap,
  Timer,
  Download,
  Share2,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { GlassCard, Badge, ProgressBar, SectionLabel, GlassButton } from '../ui';
import { useAgentAnalytics } from '../../hooks/useDashboard';
import { useExecutionHistory } from '../../hooks/useExecute';
import { useStories } from '../../hooks/useStories';
import { useExport } from '../../hooks/useExport';
import { cn } from '../../lib/utils';
import type { AgentAnalytics } from '../../types';
import type { Story } from '../../stores/storyStore';

// --- Fallback Mock Data (used when APIs unavailable) ---

const keyMetrics = [
  {
    label: 'Velocity',
    value: '12',
    unit: 'stories/week',
    trend: 'up' as const,
    trendValue: '+18%',
    icon: Zap,
    color: 'text-blue-400',
  },
  {
    label: 'Cycle Time',
    value: '2.3',
    unit: 'hours avg',
    trend: 'down' as const,
    trendValue: '-12%',
    icon: Timer,
    color: 'text-green-400',
  },
  {
    label: 'Error Rate',
    value: '4.2',
    unit: '%',
    trend: 'up' as const,
    trendValue: '+0.8%',
    icon: AlertTriangle,
    color: 'text-yellow-400',
    sparkline: [2, 3, 4, 3, 5, 4, 4],
  },
  {
    label: 'Completed',
    value: '47',
    unit: 'stories this month',
    trend: 'up' as const,
    trendValue: '+23%',
    icon: CheckCircle,
    color: 'text-emerald-400',
  },
];

const agentPerformance = [
  { name: 'Dex (Dev)', stories: 18, hours: 42, successRate: 96 },
  { name: 'Quinn (QA)', stories: 15, hours: 28, successRate: 98 },
  { name: 'Atlas (Architect)', stories: 8, hours: 16, successRate: 100 },
  { name: 'River (SM)', stories: 12, hours: 20, successRate: 94 },
  { name: 'Sage (PO)', stories: 10, hours: 22, successRate: 97 },
  { name: 'Gage (DevOps)', stories: 6, hours: 14, successRate: 100 },
  { name: 'Aria (Analyst)', stories: 5, hours: 10, successRate: 92 },
];

const weeklyActivity = [
  { day: 'Mon', count: 8 },
  { day: 'Tue', count: 12 },
  { day: 'Wed', count: 6 },
  { day: 'Thu', count: 14 },
  { day: 'Fri', count: 10 },
  { day: 'Sat', count: 3 },
  { day: 'Sun', count: 1 },
];

const bottlenecks = [
  { status: 'In Review', count: 7, avgTime: '4.5h' },
  { status: 'Blocked', count: 3, avgTime: '12.2h' },
  { status: 'QA Validation', count: 4, avgTime: '2.1h' },
];

// --- Component ---

export default function InsightsView({ viewToggle }: { viewToggle?: React.ReactNode } = {}) {
  const { data: historyData } = useExecutionHistory(200);
  const { data: agentAnalytics } = useAgentAnalytics();
  const { stories } = useStories();
  const { exportData, shareUrl } = useExport();

  // Compute real metrics from execution history
  const realMetrics = useMemo(() => {
    if (!historyData?.executions?.length) return null;
    const execs = historyData.executions;
    const completed = execs.filter(e => e.status === 'completed');
    const failed = execs.filter(e => e.status === 'failed');
    const errorRate = execs.length > 0 ? ((failed.length / execs.length) * 100).toFixed(1) : '0';

    // Weekly velocity (stories completed in last 7 days)
    // eslint-disable-next-line react-hooks/purity -- Date.now() is stable within this memoized computation
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCompleted = completed.filter(e => new Date(e.createdAt || '').getTime() > weekAgo);

    // Average cycle time
    const avgDuration = completed.length > 0
      ? (completed.reduce((sum, e) => sum + (e.duration || 0), 0) / completed.length / 3600).toFixed(1)
      : '0';

    return {
      velocity: recentCompleted.length,
      cycleTime: avgDuration,
      errorRate,
      completed: completed.length,
      total: execs.length,
    };
  }, [historyData]);

  // Compute real agent performance
  const realAgentPerf = useMemo(() => {
    if (!agentAnalytics) return null;
    return agentAnalytics.slice(0, 7).map((a: AgentAnalytics) => ({
      name: a.agentName || a.agentId,
      stories: a.totalExecutions || 0,
      hours: Math.round((a.avgResponseTime || 0) / 3600),
      successRate: a.totalExecutions > 0 ? Math.round((a.successRate || 0)) : 100,
    }));
  }, [agentAnalytics]);

  // Compute real weekly activity
  const realWeekly = useMemo(() => {
    if (!historyData?.executions?.length) return null;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      const count = historyData.executions.filter(e => (e.createdAt || '').startsWith(key)).length;
      return { day: dayNames[d.getDay()], count };
    });
  }, [historyData]);

  // Compute bottlenecks from stories
  const realBottlenecks = useMemo(() => {
    if (!stories?.length) return null;
    const statusCounts: Record<string, number> = {};
    stories.forEach((s: Story) => {
      if (s.status !== 'done' && s.status !== 'backlog') {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      }
    });
    return Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count, avgTime: '-' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [stories]);

  // Use real data when available, fallback to mock
  const metrics = realMetrics
    ? [
        { label: 'Velocity', value: String(realMetrics.velocity), unit: 'stories/week', trend: 'up' as const, trendValue: 'Live', icon: Zap, color: 'text-blue-400', sparkline: undefined as number[] | undefined },
        { label: 'Cycle Time', value: realMetrics.cycleTime, unit: 'hours avg', trend: 'down' as const, trendValue: 'Live', icon: Timer, color: 'text-green-400', sparkline: undefined as number[] | undefined },
        { label: 'Error Rate', value: realMetrics.errorRate, unit: '%', trend: Number(realMetrics.errorRate) > 5 ? 'up' as const : 'down' as const, trendValue: `${realMetrics.total} total`, icon: AlertTriangle, color: 'text-yellow-400', sparkline: undefined as number[] | undefined },
        { label: 'Completed', value: String(realMetrics.completed), unit: `of ${realMetrics.total}`, trend: 'up' as const, trendValue: 'Live', icon: CheckCircle, color: 'text-emerald-400', sparkline: undefined as number[] | undefined },
      ]
    : keyMetrics;
  const agents = realAgentPerf || agentPerformance;
  const weekly = realWeekly || weeklyActivity;
  const bots = realBottlenecks || bottlenecks;
  const maxWeek = Math.max(...weekly.map((d) => d.count), 1);

  // AI Recommendations — generated from data patterns
  const recommendations = useMemo(() => {
    const recs: { type: 'warning' | 'success' | 'info'; title: string; description: string }[] = [];

    if (realMetrics) {
      if (Number(realMetrics.errorRate) > 10) {
        recs.push({ type: 'warning', title: 'Taxa de erro elevada', description: `Error rate em ${realMetrics.errorRate}%. Revise logs dos últimos erros e considere adicionar testes automatizados.` });
      }
      if (realMetrics.velocity === 0) {
        recs.push({ type: 'warning', title: 'Velocity zerada', description: 'Nenhuma story completada esta semana. Verifique se há bloqueios no pipeline.' });
      }
      if (Number(realMetrics.cycleTime) > 8) {
        recs.push({ type: 'info', title: 'Cycle time alto', description: `Média de ${realMetrics.cycleTime}h por task. Considere dividir stories em sub-tasks menores.` });
      }
      if (Number(realMetrics.errorRate) < 2 && realMetrics.completed > 10) {
        recs.push({ type: 'success', title: 'Qualidade excelente', description: `Apenas ${realMetrics.errorRate}% de erros com ${realMetrics.completed} execuções. O pipeline está saudável.` });
      }
    }

    if (bots.length > 0 && bots[0].count > 5) {
      recs.push({ type: 'warning', title: `Bottleneck: ${bots[0].status}`, description: `${bots[0].count} stories paradas neste estágio. Considere rebalancear agents ou revisar o processo.` });
    }

    if (agents.length > 0) {
      const slowAgent = agents.find(a => a.successRate < 85);
      if (slowAgent) {
        recs.push({ type: 'info', title: `Agent com baixa performance`, description: `${slowAgent.name} está com ${slowAgent.successRate}% de sucesso. Revise as configurações ou redistribua tarefas.` });
      }
    }

    if (recs.length === 0) {
      recs.push({ type: 'success', title: 'Tudo funcionando bem', description: 'Nenhuma anomalia detectada nos dados atuais. Continue monitorando.' });
    }

    return recs;
  }, [realMetrics, bots, agents]);

  const hasLiveData = !!realMetrics;

  return (
    <div className="h-full overflow-y-auto glass-scrollbar p-6 space-y-6" tabIndex={0} role="region" aria-label="Painel de insights">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={22} className="text-blue-400" />
          <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
          <Badge variant="status" status={hasLiveData ? 'success' : 'warning'} size="sm">
            {hasLiveData ? 'Live' : 'Mock'}
          </Badge>
          {viewToggle}
        </div>
        <div className="flex items-center gap-2">
          <GlassButton
            variant="ghost"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => exportData(
              { metrics: metrics.map(m => ({ label: m.label, value: m.value, unit: m.unit })), agents, bottlenecks: bots },
              'insights',
              'json'
            )}
          >
            Export
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            leftIcon={<Share2 size={14} />}
            onClick={() => shareUrl('AIOS Insights')}
          >
            Share
          </GlassButton>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <GlassCard key={metric.label} padding="md" motionProps={{ transition: { delay: i * 0.05 } }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider">{metric.label}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold text-primary">{metric.value}</span>
                  <span className="text-xs text-tertiary">{metric.unit}</span>
                </div>
              </div>
              <metric.icon size={18} className={metric.color} />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {metric.trend === 'up' ? (
                <TrendingUp size={14} className={metric.label === 'Error Rate' ? 'text-red-400' : 'text-green-400'} />
              ) : (
                <TrendingDown size={14} className="text-green-400" />
              )}
              <span className={cn(
                'text-xs font-medium',
                metric.label === 'Error Rate' && metric.trend === 'up' ? 'text-red-400' : 'text-green-400',
              )}>
                {metric.trendValue}
              </span>
              {metric.sparkline && (
                <div className="flex items-end gap-px ml-auto h-4">
                  {metric.sparkline.map((v: number, j: number) => (
                    <div
                      key={j}
                      className="w-1 bg-yellow-400/60 rounded-full"
                      style={{ height: `${(v / Math.max(...metric.sparkline!)) * 100}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Agent Performance + Weekly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Performance (2 cols) */}
        <GlassCard padding="md" className="lg:col-span-2">
          <SectionLabel count={agents.length}>Agent Performance</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <div key={agent.name} className="glass-subtle rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">{agent.name}</span>
                  <Badge variant="status" status="success" size="sm">
                    {agent.successRate}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-secondary">
                  <span>{agent.stories} stories</span>
                  <span>{agent.hours}h worked</span>
                </div>
                <ProgressBar
                  value={agent.successRate}
                  size="sm"
                  variant={agent.successRate >= 96 ? 'success' : agent.successRate >= 90 ? 'warning' : 'error'}
                />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Weekly Activity */}
        <GlassCard padding="md">
          <SectionLabel>Weekly Activity</SectionLabel>
          <div className="flex items-end justify-between gap-2 h-40 mt-4">
            {weekly.map((day, idx) => (
              <div key={day.day} className="flex flex-col items-center gap-1 flex-1 group">
                <span className="text-[10px] text-tertiary mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{day.count}</span>
                <motion.div
                  className="w-full bg-blue-500/60 rounded-t-md group-hover:bg-blue-500/80 transition-colors"
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.count / maxWeek) * 100}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.06 }}
                  style={{ minHeight: 4 }}
                />
                <span className="text-[10px] text-secondary">{day.day}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Bottlenecks */}
      <GlassCard padding="md">
        <SectionLabel count={bots.length}>
          Bottlenecks
        </SectionLabel>
        <div className="space-y-3">
          {bots.map((b, idx) => (
            <motion.div
              key={b.status}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              className="flex items-center justify-between glass-subtle rounded-xl p-3 group hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-primary">{b.status}</p>
                  <p className="text-xs text-secondary">{b.count} stories stuck</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-tertiary" />
                <span className="text-sm text-secondary">avg {b.avgTime}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* AI Recommendations */}
      <GlassCard padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-amber-400" />
          <SectionLabel count={recommendations.length}>AI Recommendations</SectionLabel>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const colorMap = { warning: 'border-yellow-500/30 bg-yellow-500/5', success: 'border-green-500/30 bg-green-500/5', info: 'border-blue-500/30 bg-blue-500/5' };
            const iconColorMap = { warning: 'text-yellow-400', success: 'text-green-400', info: 'text-blue-400' };
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className={cn('rounded-xl p-3 border', colorMap[rec.type])}
              >
                <div className="flex items-start gap-3">
                  <ArrowRight size={14} className={cn('mt-0.5 flex-shrink-0', iconColorMap[rec.type])} />
                  <div>
                    <p className="text-sm font-medium text-primary">{rec.title}</p>
                    <p className="text-xs text-secondary mt-0.5">{rec.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
