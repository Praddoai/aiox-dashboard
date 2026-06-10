import { cn } from '../../../lib/utils'
import type { HTMLAttributes } from 'react'

export interface CockpitStatusIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  status: 'online' | 'offline' | 'warning' | 'busy'
  label?: string
  pulse?: boolean
}

const statusColors: Record<string, string> = {
  online: 'var(--aiox-lime)',
  offline: 'var(--color-status-error)',
  warning: 'var(--aiox-flare)',
  busy: 'var(--aiox-blue)',
}

export function CockpitStatusIndicator({ status, label, pulse = true, className, style, ...props }: CockpitStatusIndicatorProps) {
  const color = statusColors[status]

  return (
    <div
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        ...style,
      }}
      {...props}
    >
      <span
        style={{
          position: 'relative',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      >
        {pulse && status === 'online' && (
          <span
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              border: `1.5px solid ${color}`,
              animation: 'aiox-pulse 2s ease-in-out infinite',
              opacity: 0.6,
            }}
          />
        )}
      </span>
      {label && (
        <span
          style={{
            fontFamily: 'var(--font-family-mono)',
            fontSize: '0.55rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--aiox-gray-muted)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
