'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassAvatar } from '@/components/ui/GlassAvatar';
import { cn, getSquadTheme } from '@/lib/utils';
import type { WorkflowNode, WorkflowEdge } from './types';
import type { SquadType } from '@/types';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  zoom,
  onZoomChange,
  selectedNodeId,
  onSelectNode,
}: WorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Center the canvas initially based on nodes
  useEffect(() => {
    if (containerRef.current && nodes.length > 0) {
      const { width, height } = containerRef.current.getBoundingClientRect();

      // If container has no size yet, use fallback
      if (width === 0 || height === 0) {
        setPan({ x: 50, y: 50 });
        return;
      }

      // Calculate bounding box of all nodes
      const minX = Math.min(...nodes.map(n => n.position.x));
      const maxX = Math.max(...nodes.map(n => n.position.x)) + 150;
      const minY = Math.min(...nodes.map(n => n.position.y));
      const maxY = Math.max(...nodes.map(n => n.position.y)) + 100;

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      // Center the content in the viewport with some padding
      const centerX = (width - contentWidth * zoom) / 2 - minX * zoom + 50;
      const centerY = (height - contentHeight * zoom) / 2 - minY * zoom + 30;

      setPan({ x: centerX, y: centerY });
    } else if (containerRef.current) {
      // Default centering when no nodes
      const { width, height } = containerRef.current.getBoundingClientRect();
      setPan({ x: width / 4, y: height / 4 });
    }
  }, [nodes.length, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom with Ctrl/Cmd + scroll
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(Math.max(zoom + delta, 0.5), 2);
      onZoomChange(newZoom);
    }
  };

  // Prevent default zoom behavior on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefaultZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    container.addEventListener('wheel', preventDefaultZoom, { passive: false });
    return () => container.removeEventListener('wheel', preventDefaultZoom);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden cursor-grab active:cursor-grabbing relative h-full min-h-[400px]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Colorful gradient background similar to main interface */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 0% 100%, rgba(255, 90, 60, 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 70% 80% at 100% 0%, rgba(50, 180, 170, 0.30) 0%, transparent 55%),
            radial-gradient(ellipse 90% 70% at 50% 50%, rgba(140, 60, 180, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 10% 30%, rgba(255, 160, 60, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 90% 70%, rgba(60, 140, 220, 0.25) 0%, transparent 50%),
            linear-gradient(160deg, #1a1520 0%, #15181f 30%, #121420 50%, #181215 70%, #0d1015 100%)
          `
        }}
      />

      {/* Background Grid - dot pattern */}
      <div
        className="canvas-bg absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)
          `,
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Canvas Content */}
      <div
        className="absolute z-10"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          left: 0,
          top: 0,
        }}
      >
        {/* Edges (SVG) */}
        <svg
          className="absolute top-0 left-0 pointer-events-none overflow-visible"
          style={{ width: 2000, height: 1000 }}
        >
          <defs>
            {/* Gradient definitions for each squad */}
            <linearGradient id="grad-copywriting" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="grad-design" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="grad-creator" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="grad-orchestrator" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="grad-default" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>

            {/* Animated dash pattern */}
            <pattern id="dash-pattern" patternUnits="userSpaceOnUse" width="20" height="1">
              <line x1="0" y1="0" x2="10" y2="0" stroke="currentColor" strokeWidth="2" />
            </pattern>

            {/* Arrow marker */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>

            {/* Glow filter for particles */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <EdgePath
                key={edge.id}
                edge={edge}
                sourcePos={sourceNode.position}
                targetPos={targetNode.position}
                sourceSquad={sourceNode.squadType}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <WorkflowNodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onClick={() => onSelectNode(node.id)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-scrim-40 backdrop-blur-xl border border-glass-10 rounded-xl p-3">
        <p className="text-xs text-foreground-tertiary mb-2">Legenda</p>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-foreground-secondary">Concluido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-foreground-secondary">Ativo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-foreground-secondary">Aguardando</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-500" />
            <span className="text-foreground-secondary">Pendente</span>
          </div>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-4 right-4 bg-scrim-40 backdrop-blur-xl border border-glass-10 rounded-lg px-3 py-2">
        <p className="text-[10px] text-foreground-tertiary">
          <kbd className="px-1 py-0.5 rounded bg-glass-10 text-foreground-secondary">Cmd/Ctrl</kbd>
          {' + scroll para zoom . arraste para mover'}
        </p>
      </div>
    </div>
  );
}

// Edge Path Component
function EdgePath({
  edge,
  sourcePos,
  targetPos,
  sourceSquad,
}: {
  edge: WorkflowEdge;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  sourceSquad?: string;
}) {
  // Calculate control points for curved path
  const dx = targetPos.x - sourcePos.x;

  // Offset for node size
  const sourceX = sourcePos.x + 60;
  const sourceY = sourcePos.y + 30;
  const targetX = targetPos.x - 10;
  const targetY = targetPos.y + 30;

  // Create bezier curve
  const controlX1 = sourceX + dx * 0.4;
  const controlY1 = sourceY;
  const controlX2 = targetX - dx * 0.4;
  const controlY2 = targetY;

  const pathD = `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;

  const gradientId = sourceSquad ? `grad-${sourceSquad}` : 'grad-default';

  return (
    <g>
      {/* Background path */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Main path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={edge.status === 'completed' ? `url(#${gradientId})` : edge.status === 'active' ? `url(#${gradientId})` : 'rgba(255,255,255,0.2)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={edge.status === 'idle' ? '8 4' : 'none'}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
      />

      {/* Animated particle for active edges */}
      {edge.animated && edge.status === 'active' && (
        <circle
          r="4"
          fill={sourceSquad === 'copywriting' ? '#f97316' : sourceSquad === 'design' ? '#a855f7' : sourceSquad === 'creator' ? '#22c55e' : '#06b6d4'}
          className="animate-flow-particle"
          style={{
            offsetPath: `path('${pathD}')`,
          }}
        >
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </g>
  );
}

// Node Component
function WorkflowNodeComponent({
  node,
  isSelected,
  onClick,
}: {
  node: WorkflowNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  // Get squad colors from centralized theme
  const getNodeColors = (squadType: string | undefined) => {
    if (!squadType) return null;
    const theme = getSquadTheme(squadType as SquadType);
    return {
      bg: theme.gradientSubtle,
      border: theme.border + '/50',
      glow: theme.glow,
    };
  };

  const colors = getNodeColors(node.squadType);

  // Special rendering for start/end/checkpoint nodes
  if (node.type === 'start' || node.type === 'end' || node.type === 'checkpoint') {
    return (
      <motion.div
        className={cn(
          'absolute cursor-pointer',
          'flex flex-col items-center gap-2'
        )}
        style={{ left: node.position.x, top: node.position.y }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
      >
        <div
          className={cn(
            'h-14 w-14 rounded-full flex items-center justify-center',
            'bg-overlay backdrop-blur-xl border transition-all',
            node.type === 'start' && 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]',
            node.type === 'end' && 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]',
            node.type === 'checkpoint' && 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]',
            isSelected && 'ring-2 ring-offset-2 ring-offset-transparent ring-white'
          )}
        >
          {node.type === 'start' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          {node.type === 'end' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          {node.type === 'checkpoint' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          )}
        </div>
        <span className="text-xs text-foreground-secondary whitespace-nowrap">{node.label}</span>
      </motion.div>
    );
  }

  // Agent node rendering
  return (
    <motion.div
      className={cn(
        'absolute cursor-pointer',
        'w-[120px]'
      )}
      style={{ left: node.position.x, top: node.position.y }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div
        className={cn(
          'bg-overlay backdrop-blur-xl rounded-xl p-3 border transition-all',
          colors?.border || 'border-glass-10',
          isSelected && 'ring-2 ring-offset-2 ring-offset-transparent ring-white',
          node.status === 'active' && colors?.glow
        )}
        style={{
          boxShadow: node.status === 'active' && node.squadType
            ? `0 0 25px color-mix(in srgb, ${getSquadTheme(node.squadType as SquadType).cssVar} 25%, transparent)`
            : 'none'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <GlassAvatar
            name={node.agentName || '?'}
            size="sm"
            squadType={node.squadType as 'copywriting' | 'design' | 'creator' | 'orchestrator' | 'default'}
            status={node.status === 'active' ? 'online' : node.status === 'waiting' ? 'busy' : 'offline'}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground-primary font-medium truncate">{node.label}</p>
            <p className="text-[10px] text-foreground-tertiary truncate">{node.agentName}</p>
          </div>
        </div>

        {/* Progress */}
        {node.progress !== undefined && (
          <div className="space-y-1">
            <div className="h-1 rounded-full bg-glass-10 overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r',
                  colors?.bg.replace('/20', '') || 'from-gray-500 to-gray-400'
                )}
                style={{
                  background: node.squadType === 'copywriting' ? 'linear-gradient(to right, #f97316, #fbbf24)' :
                             node.squadType === 'design' ? 'linear-gradient(to right, #a855f7, #ec4899)' :
                             node.squadType === 'creator' ? 'linear-gradient(to right, #22c55e, #10b981)' :
                             node.squadType === 'orchestrator' ? 'linear-gradient(to right, #06b6d4, #3b82f6)' :
                             'linear-gradient(to right, #6b7280, #9ca3af)'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${node.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-[10px] text-foreground-tertiary text-right">{node.progress}%</p>
          </div>
        )}

        {/* Status indicator */}
        {node.status === 'active' && (
          <div className="absolute -top-1 -right-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
            </span>
          </div>
        )}
      </div>

      {/* Current action tooltip */}
      {node.status === 'active' && node.currentAction && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 bg-overlay backdrop-blur-xl border border-glass-10 rounded-lg px-2 py-1"
        >
          <p className="text-[10px] text-foreground-secondary truncate">{node.currentAction}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
