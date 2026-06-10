import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper: read a CSS custom property value at runtime
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

// Simple Line Chart Component - uses actual pixel coordinates
interface LineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  fillColor?: string;
  showGrid?: boolean;
  showLabels?: boolean;
}

export function LineChart({
  data,
  labels,
  height = 120,
  color,
  fillColor,
  showGrid = true,
  showLabels = false,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Resolve colors from CSS custom properties
  const resolvedColor = color || cssVar('--chart-line', '#8B5CF6');
  const resolvedFill = fillColor || cssVar('--chart-line-fill', 'rgba(139, 92, 246, 0.1)');

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (data.length === 0) return null;

  const chartHeight = showLabels ? height - 28 : height;
  const padding = { top: 8, right: 8, bottom: 8, left: 8 };
  const chartWidth = dimensions.width - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  // Calculate points in actual pixel coordinates
  const points = data.map((value, index) => {
    const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + innerHeight - ((value - min) / range) * innerHeight;
    return { x, y, value };
  });

  // Create polyline points string
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Create area polygon points (line + bottom corners)
  const areaPoints = [
    ...points.map(p => `${p.x},${p.y}`),
    `${points[points.length - 1]?.x || 0},${chartHeight - padding.bottom}`,
    `${padding.left},${chartHeight - padding.bottom}`,
  ].join(' ');

  return (
    <div style={{ height }}>
      {/* Chart area */}
      <div ref={containerRef} className="relative" style={{ height: chartHeight }}>
        {/* Grid lines */}
        {showGrid && (
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px` }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-full" style={{ borderTop: '1px solid var(--chart-grid, rgba(255,255,255,0.05))' }} />
            ))}
          </div>
        )}

        {dimensions.width > 0 && (<>
          <svg
            width={dimensions.width}
            height={chartHeight}
            className="absolute inset-0"
          >
            {/* Fill area */}
            <motion.polygon
              points={areaPoints}
              fill={resolvedFill}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />

            {/* Line */}
            <motion.polyline
              points={polylinePoints}
              fill="none"
              stroke={resolvedColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* Points — interactive with hover */}
            {points.map((point, index) => (
              <g key={index}>
                {/* Invisible larger hit area */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* Glow ring on hover */}
                {hoveredIndex === index && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="8"
                    fill="none"
                    stroke={resolvedColor}
                    strokeWidth="2"
                    opacity="0.3"
                  />
                )}
                {/* Visible point */}
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredIndex === index ? 5 : 4}
                  fill={resolvedColor}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.05, duration: 0.2 }}
                />
              </g>
            ))}

            {/* Vertical guide line on hover */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <line
                x1={points[hoveredIndex].x}
                y1={padding.top}
                x2={points[hoveredIndex].x}
                y2={chartHeight - padding.bottom}
                stroke={resolvedColor}
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.3"
              />
            )}
          </svg>

          {/* Tooltip */}
          <AnimatePresence>
            {hoveredIndex !== null && points[hoveredIndex] && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute pointer-events-none z-10 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg"
                style={{
                  left: Math.min(
                    Math.max(points[hoveredIndex].x - 30, 4),
                    dimensions.width - 70
                  ),
                  top: Math.max(points[hoveredIndex].y - 36, 0),
                  background: 'rgba(0,0,0,0.85)',
                  border: `1px solid ${resolvedColor}40`,
                  color: '#fff',
                }}
              >
                <span style={{ color: resolvedColor }}>{points[hoveredIndex].value}</span>
                {labels?.[hoveredIndex] && (
                  <span className="ml-1.5 opacity-60">{labels[hoveredIndex]}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>)}
      </div>

      {/* Labels */}
      {showLabels && labels && (
        <div className="flex justify-between mt-2 px-2">
          {labels.map((label, index) => (
            <span key={index} className="text-[11px] text-tertiary">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Bar Chart Component
interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  showValues?: boolean;
  horizontal?: boolean;
}

export function BarChart({
  data,
  height = 160,
  showValues = true,
  horizontal = false,
}: BarChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const defaultColors = [
    cssVar('--chart-bar-1', '#3B82F6'),
    cssVar('--chart-bar-2', '#8B5CF6'),
    cssVar('--chart-bar-3', '#22C55E'),
    cssVar('--chart-bar-4', '#F59E0B'),
    cssVar('--chart-bar-5', '#EF4444'),
    cssVar('--chart-bar-6', '#06B6D4'),
  ];

  if (horizontal) {
    return (
      <div className="space-y-3" style={{ minHeight: height }}>
        {data.map((item, index) => {
          const pct = Math.round((item.value / max) * 100);
          const barColor = item.color || defaultColors[index % defaultColors.length];
          return (
            <div key={item.label} className="space-y-1 group">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary group-hover:text-primary transition-colors">{item.label}</span>
                {showValues && (
                  <span className="text-primary font-medium">
                    {item.value}
                    <span className="text-tertiary ml-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                      ({pct}%)
                    </span>
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full overflow-hidden group-hover:h-3 transition-all" style={{ background: 'var(--chart-ring-bg, rgba(255,255,255,0.1))' }}>
                <motion.div
                  className="h-full rounded-full transition-shadow"
                  style={{
                    backgroundColor: barColor,
                    boxShadow: undefined,
                  }}
                  whileHover={{ boxShadow: `0 0 8px ${barColor}60` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const barWidth = 100 / data.length;
  const gap = 4;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item.value / max) * (height - 24);
        const x = index * barWidth + gap / 2;
        const y = height - barHeight - 20;

        return (
          <g key={item.label}>
            <motion.rect
              x={x}
              y={y}
              width={barWidth - gap}
              height={barHeight}
              rx="3"
              fill={item.color || defaultColors[index % defaultColors.length]}
              initial={{ height: 0, y: height - 20 }}
              animate={{ height: barHeight, y }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
            {showValues && (
              <text
                x={x + (barWidth - gap) / 2}
                y={y - 4}
                textAnchor="middle"
                className="text-[8px]"
                style={{ fill: 'var(--chart-text, rgba(255,255,255,0.7))' }}
              >
                {item.value}
              </text>
            )}
            <text
              x={x + (barWidth - gap) / 2}
              y={height - 6}
              textAnchor="middle"
              className="text-[7px]"
              style={{ fill: 'var(--chart-text-dim, rgba(255,255,255,0.5))' }}
            >
              {item.label.slice(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Donut Chart Component
interface DonutChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
  thickness?: number;
  showCenter?: boolean;
  centerText?: string;
  centerSubtext?: string;
}

export function DonutChart({
  data,
  size = 120,
  thickness = 16,
  showCenter = true,
  centerText,
  centerSubtext,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const defaultColors = [
    cssVar('--chart-donut-1', '#22C55E'),
    cssVar('--chart-donut-2', '#EF4444'),
    cssVar('--chart-donut-3', '#F59E0B'),
    cssVar('--chart-donut-4', '#3B82F6'),
    cssVar('--chart-donut-5', '#8B5CF6'),
  ];

  // Pre-compute cumulative offsets to avoid mutation during render
  const offsets = data.reduce<number[]>((acc, item, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + data[i - 1].value / total;
    acc.push(prev);
    return acc;
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={cssVar('--chart-ring-bg', 'rgba(255,255,255,0.1)')}
          strokeWidth={thickness}
        />

        {/* Data segments */}
        {data.map((item, index) => {
          const percentage = item.value / total;
          const strokeDasharray = circumference;
          const strokeDashoffset = circumference * (1 - percentage);
          const rotation = offsets[index] * 360;

          return (
            <motion.circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color || defaultColors[index % defaultColors.length]}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%' }}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            />
          );
        })}
      </svg>

      {/* Center content */}
      {showCenter && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-primary">
            {centerText ?? total}
          </span>
          {centerSubtext && (
            <span className="text-[10px] text-tertiary">{centerSubtext}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Sparkline Component (mini line chart)
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({
  data,
  color,
  height = 24,
  width = 60,
}: SparklineProps) {
  if (data.length < 2) return null;

  const resolvedColor = color || cssVar('--chart-sparkline', '#22C55E');
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.polyline
        points={points.join(' ')}
        fill="none"
        stroke={resolvedColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  );
}

// Progress Ring Component
interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
}

export function ProgressRing({
  value,
  max = 100,
  size = 48,
  thickness = 4,
  color,
  bgColor,
  showValue = true,
}: ProgressRingProps) {
  const resolvedColor = color || cssVar('--chart-progress-ring', '#22C55E');
  const resolvedBg = bgColor || cssVar('--chart-ring-bg', 'rgba(255,255,255,0.1)');
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        {/* Background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={resolvedBg}
          strokeWidth={thickness}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={resolvedColor}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>

      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
}
