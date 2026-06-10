import { motion } from 'framer-motion';
import { Timer, Signal, TrendingUp, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../ui';
import { useSystemHealth, useSystemMetrics } from '../../hooks/useDashboard';
import { useLLMHealth } from '../../hooks/useExecute';
import { QuickStatCard, ServiceHealthCard } from './DashboardHelpers';

// Demo fallback data for SystemTab
const DEMO_HEALTH = {
  api: { healthy: true, latency: 45 },
  database: { healthy: true, latency: 12 },
};

const DEMO_METRICS = {
  uptime: 259200,
  avgLatency: 85,
  requestsPerMinute: 4.2,
  errorRate: 0.8,
  queueSize: 0,
  activeConnections: 3,
};

const DEMO_LLM_HEALTH = {
  claude: { available: true, error: undefined },
  openai: { available: false, error: 'API key not configured' },
};

export function SystemTab() {
  const { data: rawHealth } = useSystemHealth();
  const { data: rawMetrics } = useSystemMetrics();
  const { data: rawLlmHealth } = useLLMHealth();

  const health = rawHealth || DEMO_HEALTH;
  const metrics = rawMetrics || DEMO_METRICS;
  const llmHealth = rawLlmHealth || DEMO_LLM_HEALTH;

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-6"
    >
      {/* System Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickStatCard
          label="Uptime"
          value={metrics ? formatUptime(metrics.uptime) : '-'}
          icon={Timer}
          color="green"
        />
        <QuickStatCard
          label="Latência"
          value={metrics ? `${metrics.avgLatency.toFixed(0)}ms` : '-'}
          icon={Signal}
          color="blue"
        />
        <QuickStatCard
          label="Req/min"
          value={metrics ? metrics.requestsPerMinute.toFixed(1) : '-'}
          icon={TrendingUp}
          color="purple"
        />
        <QuickStatCard
          label="Erros"
          value={metrics ? `${metrics.errorRate.toFixed(1)}%` : '-'}
          icon={AlertTriangle}
          color={metrics && metrics.errorRate < 5 ? 'green' : 'red'}
        />
      </div>

      {/* Health Status */}
      <GlassCard>
        <h2 className="font-semibold text-primary mb-4">Status dos Serviços</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ServiceHealthCard
            name="API Gateway"
            healthy={health?.api.healthy ?? true}
            latency={health?.api.latency ?? 0}
          />
          <ServiceHealthCard
            name="Database"
            healthy={health?.database.healthy ?? true}
            latency={health?.database.latency ?? 0}
          />
          <ServiceHealthCard
            name="Claude API"
            healthy={llmHealth?.claude.available ?? false}
            error={llmHealth?.claude.error}
          />
          <ServiceHealthCard
            name="OpenAI API"
            healthy={llmHealth?.openai.available ?? false}
            error={llmHealth?.openai.error}
          />
        </div>
      </GlassCard>

      {/* System Info */}
      <GlassCard>
        <h2 className="font-semibold text-primary mb-4">Informações do Sistema</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl glass-subtle">
            <p className="text-xs text-tertiary mb-1">Fila de Execução</p>
            <p className="text-xl font-semibold text-primary">{metrics?.queueSize ?? 0} tarefas</p>
          </div>
          <div className="p-3 rounded-xl glass-subtle">
            <p className="text-xs text-tertiary mb-1">Conexões Ativas</p>
            <p className="text-xl font-semibold text-primary">{metrics?.activeConnections ?? 0}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
