import { motion } from 'framer-motion';

interface InteractionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export function InteractionLine({ x1, y1, x2, y2, color }: InteractionLineProps) {
  // Offset to center of agent sprite (~20px)
  const cx1 = x1 + 20;
  const cy1 = y1 + 20;
  const cx2 = x2 + 20;
  const cy2 = y2 + 20;

  // Calculate SVG bounds
  const minX = Math.min(cx1, cx2) - 4;
  const minY = Math.min(cy1, cy2) - 4;
  const width = Math.abs(cx2 - cx1) + 8;
  const height = Math.abs(cy2 - cy1) + 8;

  return (
    <motion.svg
      className="absolute pointer-events-none"
      style={{ left: minX, top: minY, zIndex: 5 }}
      width={width}
      height={height}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <line
        x1={cx1 - minX}
        y1={cy1 - minY}
        x2={cx2 - minX}
        y2={cy2 - minY}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        strokeLinecap="round"
        opacity="0.6"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="0;14"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </line>
    </motion.svg>
  );
}
