import type { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
  trend?: { value: number; positive: boolean };
}

export function KpiCard({ icon: Icon, label, value, subtitle, color, trend }: KpiCardProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-none border"
      style={{
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="flex items-center justify-center h-9 w-9 rounded-none"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-detail text-[var(--text-muted)] truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-light tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
          {trend && (
            <span
              className="flex items-center gap-0.5 text-detail"
              style={{ color: trend.positive ? '#4ADE80' : '#EF4444' }}
            >
              {trend.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {trend.value}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[10px] text-[var(--text-muted)] truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
