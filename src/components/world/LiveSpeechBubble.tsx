import { motion, AnimatePresence } from 'framer-motion';
import type { AgentLiveActivity } from '../../stores/agentActivityStore';

interface LiveSpeechBubbleProps {
  activity: AgentLiveActivity;
  x: number;
  y: number;
  color?: string;
}

const typeStyles: Record<AgentLiveActivity['type'], { bg: string; border: string; textColor: string; icon: string }> = {
  tool_call: {
    bg: 'rgba(16, 185, 129, 0.9)',
    border: 'rgba(16, 185, 129, 0.4)',
    textColor: '#fff',
    icon: '>_',
  },
  message: {
    bg: 'rgba(99, 102, 241, 0.9)',
    border: 'rgba(99, 102, 241, 0.4)',
    textColor: '#fff',
    icon: '...',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.9)',
    border: 'rgba(239, 68, 68, 0.4)',
    textColor: '#fff',
    icon: '!',
  },
  system: {
    bg: 'rgba(0, 0, 0, 0.8)',
    border: 'rgba(255, 255, 255, 0.15)',
    textColor: 'rgba(255,255,255,0.9)',
    icon: '*',
  },
};

export function LiveSpeechBubble({ activity, x, y, color }: LiveSpeechBubbleProps) {
  const style = typeStyles[activity.type];
  const text = activity.action;
  // Estimate bubble width: min 60, max 160, based on text length
  const bubbleW = Math.max(60, Math.min(160, text.length * 5.5 + 24));
  const bubbleH = 22;

  return (
    <AnimatePresence>
      {activity.isActive && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: x - bubbleW / 2 + 20,
            top: y - 34,
            zIndex: 35,
          }}
          initial={{ opacity: 0, scale: 0.6, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: -6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* Bubble body */}
          <div
            className="relative rounded-md px-2 py-1 flex items-center gap-1"
            style={{
              backgroundColor: style.bg,
              border: `1px solid ${style.border}`,
              width: bubbleW,
              height: bubbleH,
              backdropFilter: 'blur(4px)',
              boxShadow: `0 2px 8px ${style.bg}44, 0 0 12px ${color || style.bg}22`,
            }}
          >
            {/* Type icon */}
            <span
              className="flex-shrink-0 font-mono font-bold"
              style={{
                fontSize: '7px',
                color: style.textColor,
                opacity: 0.7,
              }}
            >
              {style.icon}
            </span>

            {/* Action text */}
            <span
              className="flex-1 truncate font-mono"
              style={{
                fontSize: '8px',
                color: style.textColor,
                lineHeight: 1,
              }}
            >
              {text}
            </span>

            {/* Active pulse dot */}
            {activity.isActive && activity.type === 'tool_call' && (
              <motion.div
                className="flex-shrink-0 rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  backgroundColor: '#fff',
                }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>

          {/* Pointer triangle */}
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            className="absolute"
            style={{
              left: bubbleW / 2 - 5,
              bottom: -5,
            }}
          >
            <polygon
              points="0,0 5,6 10,0"
              fill={style.bg}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
