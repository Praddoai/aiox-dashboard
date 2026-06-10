import { motion } from 'framer-motion';
import type { ActivityEvent } from './types';
import { ACTIVITY_CONFIG, timeAgo, formatCurrency } from './mock-data';

interface ActivityTimelineProps {
  activities: ActivityEvent[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const cfg = ACTIVITY_CONFIG[activity.type];
        const Icon = cfg.icon;
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 px-3 py-2 rounded-none transition-colors"
            style={{ backgroundColor: 'transparent' }}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <div
              className="flex items-center justify-center h-6 w-6 rounded-none flex-shrink-0"
              style={{ backgroundColor: cfg.bgColor }}
            >
              <Icon className="h-3 w-3" style={{ color: cfg.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: cfg.color }} className="font-medium">{activity.agentName}</span>
                {' '}{activity.description.replace(activity.agentName, '').replace(/^[\s-]+/, '')}
              </p>
            </div>
            {activity.value && (
              <span className="text-sm font-medium tabular-nums flex-shrink-0" style={{ color: '#D1FF00' }}>
                {formatCurrency(activity.value)}
              </span>
            )}
            <span className="text-detail tabular-nums flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(activity.timestamp)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
