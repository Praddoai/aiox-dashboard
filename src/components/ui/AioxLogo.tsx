import { cn } from '../../lib/utils';

interface AioxLogoProps {
  variant?: 'full' | 'icon';
  size?: number;
  className?: string;
}

/**
 * Official AIOX brand mark and logotype.
 * Source: https://brand.aioxsquad.ai/brandbook/logo
 *
 * Uses `currentColor` — set the desired color via parent text class (e.g. `text-primary`).
 *
 * - `variant="icon"` — Geometric A triangle mark (collapsed sidebar, favicon)
 * - `variant="full"` — Full AIOX wordmark (expanded sidebar, splash)
 */

// Official brandbook SVG paths (from brand.aioxsquad.ai)
const A_PATH =
  'M0 310.6H376.464L188.219 9.4L0 310.6ZM96.047 257.35L188.219 109.875L280.392 257.35H96.047Z';
const I_PATH = 'M448.537 9.4H395.288V310.575H448.537V9.4Z';
const O_PATH =
  'M627.332 0C538.959 0 467.336 71.625 467.336 160C467.336 248.375 538.959 320 627.332 320C715.704 320 787.327 248.375 787.327 160C787.327 71.625 715.704 0 627.332 0ZM627.332 266.75C568.458 266.75 520.585 218.85 520.585 160C520.585 101.15 568.483 53.25 627.332 53.25C686.18 53.25 734.078 101.15 734.078 160C734.078 218.85 686.18 266.75 627.332 266.75Z';
const X_PATH =
  'M1088.49 9.4H1050.87L937.922 122.35L824.976 9.4H787.327V47.05L900.273 160L787.327 272.95V310.6H824.976L937.922 197.65L1050.87 310.6H1088.49V272.95L975.571 160L1088.49 47.05V9.4Z';

export function AioxLogo({ variant = 'icon', size = 32, className }: AioxLogoProps) {
  if (variant === 'icon') {
    // A symbol mark — triangle with counter cutout
    return (
      <svg
        viewBox="0 0 377 320"
        width={size * (377 / 320)}
        height={size}
        fill="none"
        className={cn('shrink-0 aiox-logo-hover', className)}
        role="img"
        aria-label="AIOX"
      >
        <path d={A_PATH} fill="currentColor" className="aiox-letter" />
      </svg>
    );
  }

  // Full AIOX wordmark
  return (
    <svg
      viewBox="0 0 1100 320"
      height={size}
      fill="none"
      className={cn('shrink-0 aiox-logo-hover', className)}
      role="img"
      aria-label="AIOX"
    >
      <path d={A_PATH} fill="currentColor" className="aiox-letter" />
      <path d={I_PATH} fill="currentColor" className="aiox-letter" />
      <path d={O_PATH} fill="currentColor" className="aiox-letter" />
      <path d={X_PATH} fill="currentColor" className="aiox-letter-x" />
    </svg>
  );
}
