import { cn } from '../../../lib/utils'
import type { HTMLAttributes } from 'react'

export interface CockpitKpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

const trendColors: Record<string, string> = {
  up: 'var(--aiox-lime)',
  down: 'var(--color-status-error)',
  neutral: 'var(--aiox-gray-dim)',
}

export function CockpitKpiCard({ label, value, change, trend = 'neutral', className, style, ...props }: CockpitKpiCardProps) {
  return (
    <div
      className={cn(className)}
      style={{
        padding: '1.25rem',
        background: 'var(--aiox-surface)',
        border: '1px solid rgba(156, 156, 156, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        ...style,
      }}
      {...props}
    >
      <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.5rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--aiox-gray-muted)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-family-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--aiox-cream)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {value}
      </span>
      {change && (
        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.6rem', color: trendColors[trend] }}>
          {trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '\u2192'} {change}
        </span>
      )}
    </div>
  )
}
