import { cn } from '../../../lib/utils'
import type { ButtonHTMLAttributes } from 'react'

export interface CockpitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function CockpitButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: CockpitButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: 'var(--font-family-mono)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
    textDecoration: 'none',
    opacity: disabled ? 0.4 : 1,
    pointerEvents: disabled || loading ? 'none' : 'auto',
  }

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '0.4rem 1rem', fontSize: '0.55rem' },
    md: { padding: '0.65rem 1.5rem', fontSize: '0.65rem' },
    lg: { padding: '0.85rem 2rem', fontSize: '0.7rem' },
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--aiox-lime)', color: 'var(--aiox-dark)' },
    secondary: { background: 'transparent', color: 'var(--aiox-cream)', border: '1px solid rgba(156, 156, 156, 0.15)' },
    ghost: { background: 'transparent', color: 'var(--aiox-gray-dim)' },
    destructive: { background: 'var(--color-status-error)', color: 'white' },
  }

  return (
    <button
      className={cn(className)}
      style={{ ...base, ...sizes[size], ...variants[variant] }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 14,
              height: 14,
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              animation: 'aiox-spin 0.6s linear infinite',
            }}
          />
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
            Carregando
          </span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
