import { type LucideIcon } from 'lucide-react';
import { GlassCard, Badge } from '../ui';
import { ICON_SIZES } from '../../lib/icons';
import { cn } from '../../lib/utils';

export function QuickStatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 border-blue-500/30',
    green: 'from-green-500/20 border-green-500/30',
    purple: 'from-purple-500/20 border-purple-500/30',
    orange: 'from-orange-500/20 border-orange-500/30',
    yellow: 'from-yellow-500/20 border-yellow-500/30',
    red: 'from-red-500/20 border-red-500/30',
  };

  return (
    <div className={cn(
      'p-4 rounded-xl bg-gradient-to-br to-transparent border',
      colorClasses[color] || colorClasses.blue
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={ICON_SIZES.xl} className="text-secondary" />
        <span className="text-xs text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

export function HealthCard({ title, status, details }: {
  title: string;
  status: 'healthy' | 'partial' | 'error';
  details: Array<{ label: string; ok?: boolean; value?: string | number }>;
}) {
  const statusColors = {
    healthy: 'border-green-500/30 bg-green-500/5',
    partial: 'border-yellow-500/30 bg-yellow-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <GlassCard className={statusColors[status]}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-primary">{title}</h3>
        <Badge
          variant="status"
          status={status === 'healthy' ? 'online' : status === 'partial' ? 'warning' : 'offline'}
          size="sm"
        >
          {status === 'healthy' ? 'OK' : status === 'partial' ? 'Parcial' : 'Erro'}
        </Badge>
      </div>
      <div className="space-y-2">
        {details.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-secondary">{d.label}</span>
            {d.ok !== undefined ? (
              <span className={d.ok ? 'text-green-400' : 'text-red-400'}>
                {d.ok ? '\u2713' : '\u2717'}
              </span>
            ) : (
              <span className="text-primary font-medium truncate max-w-[120px] text-right">{d.value}</span>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function CostProviderRow({ name, cost, tokens, color }: {
  name: string;
  cost: number;
  tokens: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500',
    green: 'bg-green-500',
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
      <div className="flex items-center gap-3">
        <div className={cn('h-3 w-3 rounded-full', colorClasses[color])} />
        <div>
          <p className="text-primary font-medium">{name}</p>
          <p className="text-xs text-tertiary">{formatNumber(tokens)} tokens</p>
        </div>
      </div>
      <p className="text-xl font-bold text-primary">${cost.toFixed(2)}</p>
    </div>
  );
}

export function ServiceHealthCard({ name, healthy, latency, error }: {
  name: string;
  healthy: boolean;
  latency?: number;
  error?: string;
}) {
  const getErrorDisplay = (err?: string): string => {
    if (!err) return 'Indisponível';
    if (err.includes('401')) return 'API key inválida';
    if (err.includes('429')) return 'Rate limit';
    return err.length > 20 ? err.slice(0, 17) + '...' : err;
  };

  return (
    <div className={cn(
      'p-4 rounded-xl border',
      healthy ? 'glass-subtle border-green-500/20' : 'glass-subtle border-red-500/20'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-3 w-3 rounded-full',
            healthy ? 'bg-green-500' : 'bg-red-500'
          )} />
          <span className="text-primary font-medium">{name}</span>
        </div>
        {healthy && latency !== undefined && (
          <span className="text-xs text-tertiary">{latency.toFixed(0)}ms</span>
        )}
      </div>
      {!healthy && error && (
        <p className="text-xs text-red-400 mt-2">{getErrorDisplay(error)}</p>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}
