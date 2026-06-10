import { cn } from '../../../lib/utils'

export interface CockpitFooterBarProps {
  left: string
  center?: string
  right?: string
  className?: string
  style?: React.CSSProperties
}

export function CockpitFooterBar({ left, center, right, className, style }: CockpitFooterBarProps) {
  return (
    <div
      className={cn(className)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1.5rem',
        borderTop: '1px solid rgba(156, 156, 156, 0.15)',
        fontFamily: 'var(--font-family-mono)',
        fontSize: '0.6rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        color: 'var(--aiox-gray-dim)',
        letterSpacing: '0.08em',
        ...style,
      }}
    >
      <span>{left}</span>
      {center && <span>{center}</span>}
      {right && <span>{right}</span>}
    </div>
  )
}
