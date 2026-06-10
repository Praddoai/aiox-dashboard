import { cn } from '../../lib/utils';
import { getAgentAvatarUrl } from '../../lib/agent-avatars';
import { getSquadTheme } from '../../lib/theme';
import type { SquadType } from '../../types';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  agentId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  squadType?: SquadType;
  status?: 'online' | 'busy' | 'offline';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-20 w-20 text-xl',
};

const statusSizeClasses = {
  sm: 'h-2 w-2 -bottom-0.5 -right-0.5',
  md: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
  lg: 'h-3 w-3 -bottom-0.5 -right-0.5',
  xl: 'h-3.5 w-3.5 -bottom-1 -right-1',
  '2xl': 'h-4 w-4 -bottom-1 -right-1',
};

function getAvatarGradientClasses(squadType: SquadType): string {
  return getSquadTheme(squadType).gradient;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  src,
  alt,
  name,
  agentId,
  size = 'md',
  squadType = 'default',
  status,
  className,
}: AvatarProps) {
  const showStatus = status !== undefined;

  // Resolve avatar: explicit src > agent avatar > initials fallback
  const resolvedSrc = src || (agentId ? getAgentAvatarUrl(agentId) : undefined) || (name ? getAgentAvatarUrl(name) : undefined);

  return (
    <div className={cn('relative inline-flex', className)}>
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
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
            'rounded-full flex items-center justify-center font-medium text-white',
            'bg-gradient-to-br',
            getAvatarGradientClasses(squadType),
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
            status === 'online' && 'status-online',
            status === 'busy' && 'status-busy',
            status === 'offline' && 'status-offline'
          )}
        />
      )}
    </div>
  );
}
