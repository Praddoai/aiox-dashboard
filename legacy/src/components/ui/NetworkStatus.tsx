'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

// Self-contained network status hook (no external dependency)
type NetworkStatusType = 'online' | 'offline' | 'slow';

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection quality via Navigator API
    const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    if (connection?.effectiveType) {
      setIsSlow(connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const status: NetworkStatusType = !isOnline ? 'offline' : isSlow ? 'slow' : 'online';

  return { status, isOnline, isSlow };
}

interface NetworkStatusBannerProps {
  className?: string;
}

export function NetworkStatusBanner({ className }: NetworkStatusBannerProps) {
  const { status, isOnline, isSlow } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when status changes
  useEffect(() => {
    setDismissed(false);
  }, [status]);

  // Don't show if online and not slow, or if dismissed
  if ((isOnline && !isSlow) || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {(!isOnline || isSlow) && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          className={cn(
            'px-4 py-2 flex items-center justify-between gap-3',
            status === 'offline' && 'bg-red-500/10 border-b border-red-500/20',
            status === 'slow' && 'bg-yellow-500/10 border-b border-yellow-500/20',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn(
              status === 'offline' && 'text-red-500',
              status === 'slow' && 'text-yellow-500',
            )}>
              {status === 'offline' ? <WifiOffIcon /> : <WifiIcon />}
            </span>
            <span className={cn(
              'text-sm font-medium',
              status === 'offline' && 'text-red-500',
              status === 'slow' && 'text-yellow-500',
            )}>
              {status === 'offline' && 'Sem conexão'}
              {status === 'slow' && 'Conexão lenta'}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-7 text-xs"
          >
            Fechar
          </Button>
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
  const { status, isOnline } = useNetworkStatus();

  const getStatusColor = () => {
    if (status === 'offline') return 'bg-red-500';
    if (status === 'slow') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className={cn(
          'w-2 h-2 rounded-full',
          getStatusColor()
        )} />
        {isOnline && (
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
        <span className="text-xs text-muted-foreground">
          {status === 'offline' && 'Offline'}
          {status === 'slow' && 'Lento'}
          {status === 'online' && 'Online'}
        </span>
      )}
    </div>
  );
}
