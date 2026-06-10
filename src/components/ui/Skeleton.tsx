import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'wave',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        'bg-white/10',
        variantClasses[variant],
        animationClasses[animation],
        variant === 'text' && !height && 'h-4',
        className
      )}
      style={style}
    />
  );
}

// Pre-built skeleton components for common use cases

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            'h-3',
            i === lines - 1 && 'w-3/4' // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return <Skeleton variant="circular" className={sizes[size]} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-4 w-1/3" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonAgentCard() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton variant="rounded" className="h-12 w-12 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton variant="text" className="h-4 w-2/3" />
          <Skeleton variant="text" className="h-3 w-full" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rounded" className="h-6 w-16" />
        <Skeleton variant="rounded" className="h-6 w-20" />
      </div>
    </div>
  );
}

export function SkeletonMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {!isUser && <SkeletonAvatar size="sm" />}
      <div className={cn('flex-1 max-w-[75%] space-y-2', isUser && 'ml-auto')}>
        <Skeleton
          variant="rounded"
          className={cn(
            'h-16',
            isUser
              ? 'bg-blue-500/20 ml-auto w-2/3'
              : 'bg-white/10 w-full'
          )}
        />
      </div>
    </div>
  );
}

export function SkeletonMessageList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMessage key={i} isUser={i % 2 === 0} />
      ))}
    </div>
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-3 w-20" />
        <Skeleton variant="circular" className="h-8 w-8" />
      </div>
      <Skeleton variant="text" className="h-8 w-24" />
      <div className="flex items-center gap-2">
        <Skeleton variant="rounded" className="h-5 w-12" />
        <Skeleton variant="text" className="h-3 w-16" />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMetricCard key={i} />
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="glass-card p-4">
        <Skeleton variant="text" className="h-4 w-32 mb-4" />
        <Skeleton variant="rounded" className="h-48 w-full" />
      </div>

      {/* List section */}
      <div className="glass-card p-4 space-y-3">
        <Skeleton variant="text" className="h-4 w-24 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <SkeletonAvatar size="sm" />
            <div className="flex-1 space-y-1">
              <Skeleton variant="text" className="h-3 w-1/3" />
              <Skeleton variant="text" className="h-2 w-1/2" />
            </div>
            <Skeleton variant="rounded" className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonAgentList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAgentCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonConversationItem() {
  return (
    <div className="flex items-start gap-2 px-3 py-2">
      <Skeleton variant="rounded" className="w-1 h-9 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Skeleton variant="text" className="h-3 w-16" />
          <Skeleton variant="text" className="h-2 w-8" />
        </div>
        <Skeleton variant="text" className="h-2 w-full" />
      </div>
      <Skeleton variant="rounded" className="h-5 w-6 flex-shrink-0" />
    </div>
  );
}

export function SkeletonConversationHistory({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonConversationItem key={i} />
      ))}
    </div>
  );
}
