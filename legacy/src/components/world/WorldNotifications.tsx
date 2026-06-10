'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DomainId } from './world-layout';
import { domains } from './world-layout';

interface WorldNotification {
  id: string;
  message: string;
  domain: DomainId;
  type: 'info' | 'success' | 'warning' | 'task';
  timestamp: number;
}

interface WorldNotificationsProps {
  /** Max notifications to show at once */
  maxVisible?: number;
}

const TYPE_ICONS: Record<WorldNotification['type'], string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  task: '→',
};

// Demo notifications that cycle for ambience
const DEMO_NOTIFICATIONS: Array<Omit<WorldNotification, 'id' | 'timestamp'>> = [
  { message: 'copywriting finished sales page draft', domain: 'content', type: 'success' },
  { message: 'media-buy optimizing campaign CPA', domain: 'sales', type: 'task' },
  { message: 'dev deployed v2.3.1 to staging', domain: 'dev', type: 'success' },
  { message: 'data-analytics report ready for review', domain: 'data', type: 'info' },
  { message: 'design-system updated component library', domain: 'design', type: 'success' },
  { message: 'devops running health check on VPS', domain: 'ops', type: 'task' },
  { message: 'youtube-content publishing new video', domain: 'content', type: 'task' },
  { message: 'funnel-creator A/B test results in', domain: 'sales', type: 'info' },
  { message: 'architect reviewing PR #142', domain: 'dev', type: 'task' },
  { message: 'creative-studio generating thumbnails', domain: 'design', type: 'task' },
];

export function WorldNotifications({ maxVisible = 4 }: WorldNotificationsProps) {
  const [notifications, setNotifications] = useState<WorldNotification[]>([]);
  const [demoIdx, setDemoIdx] = useState(0);
  const counterRef = useRef(0);

  // Auto-generate demo notifications for ambience
  useEffect(() => {
    const interval = setInterval(() => {
      setDemoIdx((prev) => {
        const idx = prev % DEMO_NOTIFICATIONS.length;
        const demo = DEMO_NOTIFICATIONS[idx];
        counterRef.current += 1;
        const notif: WorldNotification = {
          ...demo,
          id: `notif-${counterRef.current}-${Date.now()}`,
          timestamp: Date.now(),
        };

        setNotifications((prev) => {
          const next = [notif, ...prev];
          return next.slice(0, maxVisible + 2);
        });

        return prev + 1;
      });
    }, 8000 + Math.random() * 7000);

    return () => clearInterval(interval);
  }, [maxVisible]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (notifications.length === 0) return;

    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(0, -1));
    }, 6000);

    return () => clearTimeout(timer);
  }, [notifications]);

  return (
    <div
      className="absolute top-4 right-4 flex flex-col gap-1.5 z-30 pointer-events-none max-w-[260px]"
    >
      <AnimatePresence mode="popLayout">
        {notifications.slice(0, maxVisible).map((notif) => {
          const d = domains[notif.domain];
          return (
            <motion.div
              key={notif.id}
              layout
              className="pointer-events-auto rounded-lg px-2.5 py-1.5 flex items-start gap-2"
              style={{
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${d.tileColor}33`,
              }}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              {/* Type icon */}
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-full mt-0.5 text-[8px] font-bold size-3.5"
                style={{
                  background: `${d.tileColor}33`,
                  color: d.tileColor,
                }}
              >
                {TYPE_ICONS[notif.type]}
              </span>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <span
                  className="text-[9px] leading-tight block text-foreground-primary font-mono"
                >
                  {notif.message}
                </span>
                <span className="text-[7px] font-mono" style={{ color: d.tileColor }}>
                  {d.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
