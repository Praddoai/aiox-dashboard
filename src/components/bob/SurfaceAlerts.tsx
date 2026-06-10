import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';
import { GlassCard, GlassButton } from '../ui';
import type { BobDecision } from '../../stores/bobStore';
import { cn } from '../../lib/utils';

const severityBorder: Record<BobDecision['severity'], string> = {
  info: 'border-blue-500/30',
  warning: 'border-yellow-500/40',
  error: 'border-red-500/40',
};

const severityIcon: Record<BobDecision['severity'], React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
  error: <AlertTriangle className="h-4 w-4 text-red-400" />,
};

export default function SurfaceAlerts({
  decisions,
  onResolve,
}: {
  decisions: BobDecision[];
  onResolve: (id: string) => void;
}) {
  const unresolved = decisions.filter((d) => !d.resolved);

  if (unresolved.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-tertiary">No pending decisions</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {unresolved.map((decision) => (
          <motion.div
            key={decision.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            layout
          >
            <GlassCard
              padding="sm"
              className={cn('border', severityBorder[decision.severity])}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{severityIcon[decision.severity]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary">{decision.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <GlassButton size="sm" variant="primary" onClick={() => onResolve(decision.id)}>
                      Acknowledge
                    </GlassButton>
                    <span className="text-[10px] text-tertiary">
                      {new Date(decision.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
