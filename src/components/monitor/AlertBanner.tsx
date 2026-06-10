import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui';
import { useMonitorStore } from '../../stores/monitorStore';
import { cn } from '../../lib/utils';

const severityConfig = {
  info: {
    icon: Info,
    borderClass: 'border-l-2 border-l-blue-400',
    iconColor: 'text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    borderClass: 'border-l-2 border-l-yellow-400',
    iconColor: 'text-yellow-400',
  },
  error: {
    icon: AlertCircle,
    borderClass: 'border-l-2 border-l-red-400',
    iconColor: 'text-red-400',
  },
} as const;

function formatAlertTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AlertBanner() {
  const alerts = useMonitorStore((s) => s.alerts);
  const dismissAlert = useMonitorStore((s) => s.dismissAlert);

  const activeAlerts = alerts.filter((a) => !a.dismissed);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      <AnimatePresence initial={false}>
        {activeAlerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard
                padding="sm"
                variant="subtle"
                className={cn('flex items-center gap-3', config.borderClass)}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', config.iconColor)} />
                <span className="text-xs text-primary flex-1 min-w-0">
                  {alert.message}
                </span>
                <span className="text-[10px] text-tertiary font-mono whitespace-nowrap">
                  {formatAlertTime(alert.timestamp)}
                </span>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                  aria-label="Dismiss alert"
                >
                  <X className="h-3.5 w-3.5 text-tertiary" />
                </button>
              </GlassCard>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
