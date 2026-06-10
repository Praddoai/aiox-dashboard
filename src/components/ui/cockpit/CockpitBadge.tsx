import { cn } from '../../../lib/utils'
import type { HTMLAttributes } from 'react'

export interface CockpitBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'lime' | 'surface' | 'error' | 'blue' | 'solid'
}

const variantStyles: Record<string, React.CSSProperties> = {
  lime: { background: 'var(--aiox-neon-dim)', color: 'var(--aiox-lime)', border: '1px solid rgba(209, 255, 0, 0.2)' },
  surface: { background: 'var(--aiox-surface)', color: 'var(--aiox-gray-dim)', border: '1px solid rgba(156, 156, 156, 0.15)' },
  error: { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-status-error)', border: '1px solid rgba(239, 68, 68, 0.2)' },
  blue: { background: 'rgba(0, 153, 255, 0.1)', color: 'var(--aiox-blue)', border: '1px solid rgba(0, 153, 255, 0.2)' },
  solid: { background: 'var(--aiox-lime)', color: 'var(--aiox-dark)', border: 'none' },
}

export function CockpitBadge({ variant = 'lime', className, children, style, ...props }: CockpitBadgeProps) {
  return (
    <span
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        fontFamily: 'var(--font-family-mono)',
        fontSize: '0.5rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  )
}
