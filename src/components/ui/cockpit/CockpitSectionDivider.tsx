import { cn } from '../../../lib/utils'

export interface CockpitSectionDividerProps {
  label: string
  concept?: string
  num?: string
  className?: string
  style?: React.CSSProperties
}

export function CockpitSectionDivider({ label, concept, num, className, style }: CockpitSectionDividerProps) {
  return (
    <div
      className={cn(className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '0.7rem 1.5rem',
        borderTop: '1px solid rgba(156, 156, 156, 0.15)',
        borderBottom: '1px solid rgba(156, 156, 156, 0.15)',
        fontFamily: 'var(--font-family-mono)',
        fontSize: '0.65rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        background: 'var(--aiox-dark)',
        ...style,
      }}
    >
      {num && (
        <span style={{ color: 'var(--aiox-lime)', paddingRight: '0.5rem', fontSize: '0.6rem' }}>
          {num}
        </span>
      )}
      <span style={{ height: 1, flex: 1, background: 'rgba(156, 156, 156, 0.15)' }} />
      <span
        style={{
          color: 'var(--aiox-cream)',
          letterSpacing: '0.1em',
          padding: '0 1rem',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {concept && (
        <span style={{ color: 'var(--aiox-gray-dim)', padding: '0 0.8rem', whiteSpace: 'nowrap' }}>
          {concept}
        </span>
      )}
      <span style={{ height: 1, flex: 1, background: 'rgba(156, 156, 156, 0.15)' }} />
    </div>
  )
}
