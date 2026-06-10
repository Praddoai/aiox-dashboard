import { cn } from '@/lib/utils';
import type { SquadType } from '@/types';

export interface GlassAvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  squadType?: SquadType;
  status?: 'online' | 'busy' | 'offline';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const statusSizeClasses = {
  sm: 'h-2 w-2 -bottom-0.5 -right-0.5',
  md: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
  lg: 'h-3 w-3 -bottom-0.5 -right-0.5',
  xl: 'h-3.5 w-3.5 -bottom-1 -right-1',
};

const squadGradients: Record<SquadType, string> = {
  copywriting: 'from-orange-400 to-amber-500',
  design: 'from-purple-400 to-violet-500',
  creator: 'from-green-400 to-emerald-500',
  orchestrator: 'from-cyan-400 to-blue-500',
  content: 'from-red-400 to-rose-500',
  development: 'from-blue-400 to-sky-500',
  engineering: 'from-indigo-400 to-violet-500',
  analytics: 'from-teal-400 to-cyan-500',
  marketing: 'from-pink-400 to-rose-500',
  advisory: 'from-yellow-400 to-amber-500',
  default: 'from-gray-400 to-slate-500',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function GlassAvatar({
  src,
  alt,
  name,
  size = 'md',
  squadType = 'default',
  status,
  className,
}: GlassAvatarProps) {
  const showStatus = status !== undefined;

  return (
    <div className={cn('relative inline-flex', className)}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={cn(
            'rounded-full object-cover',
            'ring-2 ring-white/20',
            sizeClasses[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-medium text-foreground-primary',
            'bg-gradient-to-br',
            squadGradients[squadType],
            sizeClasses[size]
          )}
        >
          {name ? getInitials(name) : '?'}
        </div>
      )}
      {showStatus && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-white dark:border-gray-900',
            statusSizeClasses[size],
            status === 'online' && 'bg-green-500',
            status === 'busy' && 'bg-yellow-500',
            status === 'offline' && 'bg-gray-400'
          )}
        />
      )}
    </div>
  );
}
