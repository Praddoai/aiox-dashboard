import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus, useOfflineQueue } from '../../services/offline';
import { GlassButton } from './GlassButton';
import { cn } from '../../lib/utils';

const WifiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const WifiOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const SyncIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

interface NetworkStatusBannerProps {
  className?: string;
  showQueueInfo?: boolean;
}

export function NetworkStatusBanner({ className, showQueueInfo = true }: NetworkStatusBannerProps) {
  const { status, isOnline, isSlow } = useNetworkStatus();
  const { queueSize, isSyncing, sync } = useOfflineQueue();

  // Don't show if online and no queue
  if (isOnline && !isSlow && queueSize === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {(!isOnline || isSlow || queueSize > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          className={cn(
            'px-4 py-2 flex items-center justify-between gap-3',
            status === 'offline' && 'bg-red-500/10 border-b border-red-500/20',
            status === 'slow' && 'bg-yellow-500/10 border-b border-yellow-500/20',
            status === 'online' && queueSize > 0 && 'bg-blue-500/10 border-b border-blue-500/20',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn(
              status === 'offline' && 'text-red-500',
              status === 'slow' && 'text-yellow-500',
              status === 'online' && 'text-blue-500'
            )}>
              {status === 'offline' ? <WifiOffIcon /> : <WifiIcon />}
            </span>
            <span className={cn(
              'text-sm font-medium',
              status === 'offline' && 'text-red-500',
              status === 'slow' && 'text-yellow-500',
              status === 'online' && 'text-blue-500'
            )}>
              {status === 'offline' && 'Sem conexão'}
              {status === 'slow' && 'Conexão lenta'}
              {status === 'online' && queueSize > 0 && 'Sincronizando...'}
            </span>
            {showQueueInfo && queueSize > 0 && (
              <span className="text-xs text-tertiary">
                ({queueSize} pendente{queueSize > 1 ? 's' : ''})
              </span>
            )}
          </div>

          {queueSize > 0 && isOnline && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={sync}
              disabled={isSyncing}
              className="h-7 text-xs"
              leftIcon={
                <motion.span
                  animate={isSyncing ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <SyncIcon />
                </motion.span>
              }
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </GlassButton>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact indicator for header/sidebar
interface NetworkStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function NetworkStatusIndicator({ className, showLabel = false }: NetworkStatusIndicatorProps) {
  const { status, quality } = useNetworkStatus();
  const { queueSize } = useOfflineQueue();

  const getStatusColor = () => {
    if (status === 'offline') return 'bg-red-500';
    if (status === 'slow' || quality < 0.5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className={cn(
          'w-2 h-2 rounded-full',
          getStatusColor()
        )} />
        {status === 'online' && (
          <motion.div
            className={cn(
              'absolute inset-0 w-2 h-2 rounded-full',
              getStatusColor()
            )}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-tertiary">
          {status === 'offline' && 'Offline'}
          {status === 'slow' && 'Lento'}
          {status === 'online' && 'Online'}
        </span>
      )}
      {queueSize > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-500">
          {queueSize}
        </span>
      )}
    </div>
  );
}
