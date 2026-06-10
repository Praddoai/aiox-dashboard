import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Clock, Zap } from 'lucide-react';
import { GlassCard, ProgressBar } from '../ui';
import type { AgentMonitorData } from './AgentMonitorCard';

interface AgentPerformanceStatsProps {
  agents: AgentMonitorData[];
}

function StatCard({
  icon,
  label,
  value,
  sub,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <GlassCard padding="md" className="h-full">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-cyan-400">{icon}</span>
          <span className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {sub && <div className="text-[10px] text-tertiary mt-0.5">{sub}</div>}
      </GlassCard>
    </motion.div>
  );
}

export function AgentPerformanceStats({ agents }: AgentPerformanceStatsProps) {
  const totalExecs = agents.reduce(
    (sum, a) => sum + (a.totalExecutions ?? 0),
    0
  );

  const agentsWithRate = agents.filter((a) => a.successRate !== undefined);
  const avgSuccessRate =
    agentsWithRate.length > 0
      ? Math.round(
          agentsWithRate.reduce((sum, a) => sum + (a.successRate ?? 0), 0) /
            agentsWithRate.length
        )
      : 0;

  const agentsWithTime = agents.filter((a) => a.avgResponseTime !== undefined);
  const avgResponseTime =
    agentsWithTime.length > 0
      ? Math.round(
          agentsWithTime.reduce(
            (sum, a) => sum + (a.avgResponseTime ?? 0),
            0
          ) / agentsWithTime.length
        )
      : 0;

  const activeCount = agents.filter(
    (a) => a.status === 'working' || a.status === 'waiting'
  ).length;

  function formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<Activity size={16} />}
        label="Total Executions"
        value={totalExecs.toLocaleString()}
        sub={`${agents.length} agents`}
        delay={0}
      />
      <StatCard
        icon={<CheckCircle2 size={16} />}
        label="Avg Success Rate"
        value={`${avgSuccessRate}%`}
        sub={
          <ProgressBar
            value={avgSuccessRate}
            size="sm"
            variant={
              avgSuccessRate >= 95
                ? 'success'
                : avgSuccessRate >= 80
                  ? 'warning'
                  : 'error'
            }
            className="mt-1"
          />
        }
        delay={0.05}
      />
      <StatCard
        icon={<Clock size={16} />}
        label="Avg Response"
        value={formatMs(avgResponseTime)}
        sub={`across ${agentsWithTime.length} agents`}
        delay={0.1}
      />
      <StatCard
        icon={<Zap size={16} />}
        label="Active Now"
        value={activeCount}
        sub={`of ${agents.length} total`}
        delay={0.15}
      />
    </div>
  );
}
