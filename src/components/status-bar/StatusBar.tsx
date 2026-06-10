import { useState, useEffect, useCallback } from 'react';
import { StatusDot } from '../ui';
import { cn } from '../../lib/utils';
import { Wifi, WifiOff, Bell } from 'lucide-react';
import { useLLMHealth, useTokenUsage } from '../../hooks/useExecute';
import { useBobStore } from '../../stores/bobStore';
import { useToastStore } from '../../stores/toastStore';
import { useEngineJobs } from '../../hooks/useEngine';

export function StatusBar() {
  // Network connectivity
  const [connected, setConnected] = useState(navigator.onLine);
  useEffect(() => {
    const onOnline = () => setConnected(true);
    const onOffline = () => setConnected(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // LLM health
  const { data: health } = useLLMHealth();
  const claudeReady = health?.claude?.available ?? false;

  // Token usage
  const { data: usage } = useTokenUsage();
  const apiUsage = {
    current: usage?.total?.requests ?? 0,
    limit: 100,
  };

  // Bob status
  const bobActive = useBobStore((s) => s.isActive);

  // Active agent from running engine jobs
  const { data: runningJobs } = useEngineJobs({ status: 'running', limit: 1 });
  const activeJob = runningJobs?.jobs?.[0] ?? null;
  const activeAgent = activeJob ? `@${activeJob.agent_id}` : null;

  // Notification count from toast store
  const unreadCount = useToastStore((s) => s.unreadCount);
  const markAllRead = useToastStore((s) => s.markAllRead);

  const handleBellClick = useCallback(() => {
    if (unreadCount > 0) markAllRead();
  }, [unreadCount, markAllRead]);

  return (
    <footer
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30',
        'h-7 px-3 flex items-center justify-between',
        'glass-subtle border-t border-glass-border',
        'text-[10px] select-none'
      )}
      role="contentinfo"
      aria-label="Status bar"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="h-3 w-3 text-green-500" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" aria-hidden="true" />
          )}
          <span
            className={cn(
              'font-medium',
              connected ? 'text-green-500' : 'text-red-500'
            )}
          >
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Separator */}
        <span className="h-3 w-px bg-glass-border" aria-hidden="true" />

        {/* API rate limit */}
        <span className="text-tertiary font-mono">
          API: {apiUsage.current}/{apiUsage.limit}
        </span>

        {/* Separator */}
        <span className="h-3 w-px bg-glass-border" aria-hidden="true" />

        {/* Claude status */}
        <div className="flex items-center gap-1.5">
          <StatusDot
            status={claudeReady ? 'success' : 'waiting'}
            size="sm"
            glow={claudeReady}
          />
          <span
            className={cn(
              'font-medium',
              claudeReady ? 'text-green-500' : 'text-yellow-500'
            )}
          >
            {claudeReady ? 'Claude Ready' : 'Claude Busy'}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Bob status */}
        <div className="flex items-center gap-1.5">
          <StatusDot
            status={bobActive ? 'working' : 'idle'}
            size="sm"
            pulse={bobActive}
          />
          <span className="text-tertiary">
            Bob: {bobActive ? 'Active' : 'Idle'}
          </span>
        </div>

        {/* Active agent */}
        {activeAgent && (
          <>
            <span className="h-3 w-px bg-glass-border" aria-hidden="true" />
            <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">
              {activeAgent}
            </span>
          </>
        )}

        {/* Separator */}
        <span className="h-3 w-px bg-glass-border" aria-hidden="true" />

        {/* Notification count */}
        <button
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          onClick={handleBellClick}
          aria-label={unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Sem notificações'}
        >
          <Bell className="h-3 w-3 text-tertiary" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </footer>
  );
}
