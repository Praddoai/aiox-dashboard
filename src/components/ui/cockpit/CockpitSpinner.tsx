import { cn } from '../../../lib/utils'
import type { HTMLAttributes } from 'react'

export interface CockpitSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 16, md: 24, lg: 36 }

export function CockpitSpinner({ size = 'md', className, style, ...props }: CockpitSpinnerProps) {
  const s = sizeMap[size]
  return (
    <div
      className={cn(className)}
      role="status"
      aria-label="Loading"
      style={{
        width: s,
        height: s,
        border: '2px solid rgba(156, 156, 156, 0.15)',
        borderTopColor: 'var(--aiox-lime)',
        borderRadius: '50%',
        animation: 'aiox-spin 0.7s linear infinite',
        ...style,
      }}
      {...props}
    />
  )
}
