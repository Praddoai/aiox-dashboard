import { motion, AnimatePresence } from 'framer-motion';
import type { BubbleContent } from './useAgentMovement';

interface SpeechBubbleProps {
  content: BubbleContent;
  x: number;
  y: number;
  color?: string;
}

const bubbleIcons: Record<BubbleContent, string> = {
  thinking: '...',
  eureka: '!',
  code: '</>',
  money: '$',
  chart: '|||',
  chat: '~~',
};

export function SpeechBubble({ content, x, y, color = '#fff' }: SpeechBubbleProps) {
  const icon = bubbleIcons[content];

  return (
    <AnimatePresence>
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: x + 12,
          top: y - 22,
          zIndex: 30,
        }}
        initial={{ opacity: 0, scale: 0.5, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -4 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <svg width="28" height="22" viewBox="0 0 28 22" style={{ imageRendering: 'pixelated' }}>
          {/* Bubble body */}
          <rect x="2" y="0" width="24" height="16" rx="4" fill="rgba(0,0,0,0.75)" />
          {/* Pointer */}
          <polygon points="8,16 12,20 16,16" fill="rgba(0,0,0,0.75)" />
          {/* Icon text */}
          <text
            x="14"
            y="12"
            textAnchor="middle"
            fill={color}
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {icon}
          </text>
        </svg>
      </motion.div>
    </AnimatePresence>
  );
}
