import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { TILE_WIDTH, TILE_HEIGHT } from './world-layout';

interface IsometricTileProps {
  /** Grid column */
  col: number;
  /** Grid row */
  row: number;
  /** Fill color */
  color: string;
  /** Border/stroke color */
  borderColor?: string;
  /** Is this tile highlighted / hovered */
  highlighted?: boolean;
  /** Glow pulse animation (for active rooms) */
  pulse?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Children rendered inside the tile */
  children?: React.ReactNode;
  /** Extra className */
  className?: string;
  /** Pixel offset for centering the world */
  offsetX?: number;
  offsetY?: number;
}

/**
 * Renders a single isometric diamond tile at a grid position.
 * Uses CSS transform for the isometric perspective.
 */
export function IsometricTile({
  col,
  row,
  color,
  borderColor,
  highlighted,
  pulse,
  onClick,
  children,
  className,
  offsetX = 0,
  offsetY = 0,
}: IsometricTileProps) {
  // Convert grid position to pixel position (isometric projection)
  const px = (col - row) * (TILE_WIDTH / 2) + offsetX;
  const py = (col + row) * (TILE_HEIGHT / 2) + offsetY;

  return (
    <motion.div
      className={cn(
        'absolute flex items-center justify-center',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{
        left: px,
        top: py,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
      }}
      whileHover={onClick ? { scale: 1.08, zIndex: 10 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
    >
      {/* Diamond shape via SVG */}
      <svg
        viewBox={`0 0 ${TILE_WIDTH} ${TILE_HEIGHT}`}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      >
        <polygon
          points={`${TILE_WIDTH / 2},0 ${TILE_WIDTH},${TILE_HEIGHT / 2} ${TILE_WIDTH / 2},${TILE_HEIGHT} 0,${TILE_HEIGHT / 2}`}
          fill={color}
          stroke={borderColor || color}
          strokeWidth="1.5"
          opacity={highlighted ? 1 : 0.85}
        />
        {pulse && (
          <polygon
            points={`${TILE_WIDTH / 2},0 ${TILE_WIDTH},${TILE_HEIGHT / 2} ${TILE_WIDTH / 2},${TILE_HEIGHT} 0,${TILE_HEIGHT / 2}`}
            fill={color}
            opacity={0.4}
          >
            <animate
              attributeName="opacity"
              values="0.4;0.1;0.4"
              dur="2s"
              repeatCount="indefinite"
            />
          </polygon>
        )}
      </svg>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
        {children}
      </div>
    </motion.div>
  );
}
