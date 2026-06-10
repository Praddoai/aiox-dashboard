import { motion } from 'framer-motion';
import { GlassCard } from '../ui';
import { useCostSummary } from '../../hooks/useDashboard';
import { useTokenUsage } from '../../hooks/useExecute';
import { LineChart, BarChart } from './Charts';
import { CostProviderRow } from './DashboardHelpers';
import { TrendUpIcon } from './dashboard-icons';

// Demo fallback data for CostsTab
const DEMO_COST_SUMMARY = {
  today: 1.24,
  thisWeek: 8.75,
  thisMonth: 32.40,
  byProvider: { claude: 24.80, openai: 7.60 },
  bySquad: { 'core-squad': 18.50, 'management-squad': 9.20, 'design-squad': 4.70 },
  trend: [3.20, 4.10, 5.80, 4.50, 6.20, 5.40, 3.20],
};

const DEMO_TOKEN_USAGE = {
  total: { input: 245000, output: 182000, requests: 156 },
  claude: { input: 180000, output: 135000, requests: 98 },
  openai: { input: 65000, output: 47000, requests: 58 },
};

export function CostsTab() {
  const { data: rawCostSummary } = useCostSummary();
  const { data: rawTokenUsage } = useTokenUsage();

  const costSummary = rawCostSummary || DEMO_COST_SUMMARY;
  const tokenUsage = rawTokenUsage || DEMO_TOKEN_USAGE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-6"
    >
      {/* Cost Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <p className="text-sm text-secondary mb-1">Hoje</p>
          <p className="text-3xl font-bold text-primary">${costSummary?.today.toFixed(2) || '0.00'}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
            <TrendUpIcon />
            <span>Estimativa</span>
          </div>
        </GlassCard>

        <GlassCard className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <p className="text-sm text-secondary mb-1">Esta Semana</p>
          <p className="text-3xl font-bold text-primary">${costSummary?.thisWeek.toFixed(2) || '0.00'}</p>
        </GlassCard>

        <GlassCard className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <p className="text-sm text-secondary mb-1">Este Mês</p>
          <p className="text-3xl font-bold text-primary">${costSummary?.thisMonth.toFixed(2) || '0.00'}</p>
        </GlassCard>
      </div>

      {/* Cost by Provider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <h2 className="font-semibold text-primary mb-4">Custo por Provider</h2>
          <div className="space-y-4">
            <CostProviderRow
              name="Claude (Anthropic)"
              cost={costSummary?.byProvider.claude || 0}
              tokens={(tokenUsage?.claude.input ?? 0) + (tokenUsage?.claude.output ?? 0)}
              color="purple"
            />
            <CostProviderRow
              name="OpenAI"
              cost={costSummary?.byProvider.openai || 0}
              tokens={(tokenUsage?.openai.input ?? 0) + (tokenUsage?.openai.output ?? 0)}
              color="green"
            />
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="font-semibold text-primary mb-4">Trend de Custos (7 dias)</h2>
          {costSummary?.trend && (
            <LineChart
              data={costSummary.trend}
              labels={['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']}
              height={140}
              showLabels
            />
          )}
        </GlassCard>
      </div>

      {/* Cost by Squad */}
      <GlassCard>
        <h2 className="font-semibold text-primary mb-4">Custo por Squad</h2>
        {costSummary?.bySquad && Object.keys(costSummary.bySquad).length > 0 ? (
          <BarChart
            data={Object.entries(costSummary.bySquad)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([squad, cost]) => ({
                label: squad.split('-')[0] || squad,
                value: Math.round(cost * 100) / 100,
              }))}
            horizontal
            height={200}
          />
        ) : (
          <p className="text-center text-tertiary py-8">Nenhum dado de custo por squad</p>
        )}
      </GlassCard>
    </motion.div>
  );
}
