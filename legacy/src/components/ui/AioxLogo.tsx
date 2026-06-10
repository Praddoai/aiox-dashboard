import { cn } from '@/lib/utils';

interface AioxLogoProps {
  variant?: 'full' | 'icon';
  size?: number;
  className?: string;
}

/**
 * AIOX brand mark and logotype.
 * Uses `currentColor` — set the desired color via parent text class (e.g. `text-foreground`).
 *
 * - `variant="icon"` — Circle + geometric A mark (for collapsed sidebar, favicon)
 * - `variant="full"` — Icon + "AIOX" logotype (for expanded sidebar, splash)
 */
export function AioxLogo({ variant = 'icon', size = 32, className }: AioxLogoProps) {
  // The geometric A mark path — an upward arrow/chevron at the apex with triangular counter
  const markPath =
    'M32 11 L37 21 L33.5 21 L48 51 L39 51 L33.5 29 L30.5 29 L25 51 L16 51 L30.5 21 L27 21 Z';

  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        className={cn('shrink-0', className)}
        role="img"
        aria-label="AIOX"
      >
        <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="2.5" />
        <path fill="currentColor" d={markPath} />
      </svg>
    );
  }

  // Full logotype: icon + "AIOX" text
  // viewBox 210x64 — icon (0-64) | gap (14) | A I O X text
  return (
    <svg
      viewBox="0 0 210 64"
      height={size}
      fill="none"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="AIOX"
    >
      {/* Icon mark */}
      <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="2.5" />
      <path fill="currentColor" d={markPath} />

      {/* A — geometric triangle with arrow chevron and counter */}
      <path
        fill="currentColor"
        d="M95 11 L100.5 21 L97.5 21 L112 51 L103.5 51 L97.5 29 L92.5 29 L86.5 51 L78 51 L92.5 21 L89.5 21 Z"
      />

      {/* I — simple rectangle */}
      <rect x="119" y="13" width="6.5" height="38" rx="0.5" fill="currentColor" />

      {/* O — circle ring */}
      <circle cx="150" cy="32" r="16" stroke="currentColor" strokeWidth="5" />

      {/* X — crossed diagonals */}
      <path
        fill="currentColor"
        d="M174 13 L181 13 L189.5 27.5 L198 13 L205 13 L193.5 32 L205 51 L198 51 L189.5 36.5 L181 51 L174 51 L185.5 32 Z"
      />
    </svg>
  );
}
