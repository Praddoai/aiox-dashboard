import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Bot, Zap, CheckCircle } from 'lucide-react';
import { GlassCard, Badge } from '../ui';
import { LiveMetricCard } from './LiveMetricCard';
import { useSquads } from '../../hooks/useSquads';
import { useAgents } from '../../hooks/useAgents';
import { useExecutionHistory, useTokenUsage, useLLMHealth } from '../../hooks/useExecute';
import { useMCPStats } from '../../hooks/useDashboard';
import { LineChart, DonutChart } from './Charts';
import { HealthCard, formatNumber } from './DashboardHelpers';
import { RegistryQuickAccess } from './RegistryQuickAccess';

// Skeleton for the overview tab
export function OverviewSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 pb-6"
    >
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white/5 space-y-3 shimmer"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/10" />
              <div className="w-16 h-3 rounded bg-white/10" />
            </div>
            <div className="w-20 h-7 rounded bg-white/10" />
            <div className="w-full h-6 rounded bg-white/5" />
          </div>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-4 rounded-xl bg-white/5 shimmer" style={{ animationDelay: '400ms' }}>
          <div className="w-40 h-5 rounded bg-white/10 mb-4" />
          <div className="w-full h-48 rounded bg-white/5" />
        </div>
        <div className="p-4 rounded-xl bg-white/5 shimmer" style={{ animationDelay: '500ms' }}>
          <div className="w-32 h-5 rounded bg-white/10 mb-4" />
          <div className="w-full h-48 rounded bg-white/5 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-white/5" />
          </div>
        </div>
      </div>
      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/5 shimmer" style={{ animationDelay: `${600 + i * 100}ms` }}>
            <div className="w-36 h-5 rounded bg-white/10 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10" />
                  <div className="flex-1 h-3 rounded bg-white/10" />
                  <div className="w-12 h-3 rounded bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function OverviewTab() {
  const { data: squads } = useSquads();
  const { data: agents } = useAgents();
  const { data: historyData } = useExecutionHistory(100);
  const { data: tokenUsage } = useTokenUsage();
  const { data: llmHealth } = useLLMHealth();
  const { data: mcpStats } = useMCPStats();

  // Show skeleton only during initial load — never block forever
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => { const t = setTimeout(() => setInitialLoad(false), 1500); return () => clearTimeout(t); }, []);
  const isLoading = initialLoad && !squads && !agents && !historyData;

  const executions = useMemo(() => historyData?.executions || [], [historyData?.executions]);
  const completedCount = executions.filter(e => e.status === 'completed').length;
  const successRate = executions.length > 0 ? Math.round((completedCount / executions.length) * 100) : 100;

  // Compute real execution trend from history (last 7 days)
  const { executionTrend, trendLabels } = useMemo(() => {
    const now = new Date();
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return { key: d.toISOString().split('T')[0], label: dayNames[d.getDay()] };
    });
    const trend = days.map(({ key }) =>
      executions.filter(e => (e.createdAt || '').startsWith(key)).length
    );
    return { executionTrend: trend, trendLabels: days.map(d => d.label) };
  }, [executions]);

  if (isLoading) return <OverviewSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-6"
    >
      {/* Live Metric Cards — stagger entrance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          <LiveMetricCard
            key="squads"
            label="Squads"
            value={squads?.length || 0}
            icon={<Package size={14} className="text-blue-400" />}
            color="#3B82F6"
            sparkline={executionTrend}
          />,
          <LiveMetricCard
            key="agents"
            label="Agents"
            value={agents?.length || 0}
            icon={<Bot size={14} className="text-emerald-400" />}
            color="#10B981"
            trend="up"
            trendValue="Online"
            isLive
          />,
          <LiveMetricCard
            key="exec"
            label="Execuções"
            value={executions.length}
            icon={<Zap size={14} className="text-purple-400" />}
            color="#8B5CF6"
            sparkline={executionTrend}
            trend={executionTrend[6] > executionTrend[5] ? 'up' : executionTrend[6] < executionTrend[5] ? 'down' : 'flat'}
            trendValue={executionTrend[6] > 0 ? `${executionTrend[6]} hoje` : undefined}
          />,
          <LiveMetricCard
            key="success"
            label="Sucesso"
            value={successRate}
            format="percent"
            icon={<CheckCircle size={14} style={{ color: successRate >= 90 ? '#10B981' : successRate >= 70 ? '#F59E0B' : '#EF4444' }} />}
            color={successRate >= 90 ? '#10B981' : successRate >= 70 ? '#F59E0B' : '#EF4444'}
            trend={successRate >= 90 ? 'up' : successRate >= 70 ? 'flat' : 'down'}
          />,
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, delay: i * 0.08, ease: [0, 0, 0.2, 1] }}
          >
            {card}
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Execution Trend */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-primary">Execuções (7 dias)</h2>
            <Badge variant="count" size="sm">{executions.length} total</Badge>
          </div>
          <LineChart
            data={executionTrend}
            labels={trendLabels}
            height={160}
            showLabels
          />
        </GlassCard>

        {/* Status Distribution */}
        <GlassCard>
          <h2 className="font-semibold text-primary mb-4">Status</h2>
          <div className="flex justify-center py-2">
            <DonutChart
              data={[
                { label: 'Sucesso', value: completedCount },
                { label: 'Falha', value: executions.length - completedCount },
              ]}
              size={120}
              thickness={16}
              centerText={`${successRate}%`}
              centerSubtext="sucesso"
            />
          </div>
        </GlassCard>
      </div>

      {/* Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthCard
          title="LLMs"
          status={llmHealth?.claude.available && llmHealth?.openai.available ? 'healthy' : 'partial'}
          details={[
            { label: 'Claude', ok: llmHealth?.claude.available ?? false },
            { label: 'OpenAI', ok: llmHealth?.openai.available ?? false },
          ]}
        />
        <HealthCard
          title="MCP Servers"
          status={mcpStats && mcpStats.connectedServers > 0 ? 'healthy' : 'error'}
          details={[
            { label: 'Conectados', value: mcpStats?.connectedServers || 0 },
            { label: 'Tools', value: mcpStats?.totalTools || 0 },
          ]}
        />
        <HealthCard
          title="Tokens"
          status="healthy"
          details={[
            { label: 'Total', value: formatNumber((tokenUsage?.total?.input ?? 0) + (tokenUsage?.total?.output ?? 0)) },
            { label: 'Requests', value: tokenUsage?.total?.requests ?? 0 },
          ]}
        />
      </div>

      {/* AIOS Registry Quick Access */}
      <RegistryQuickAccess />
    </motion.div>
  );
}
