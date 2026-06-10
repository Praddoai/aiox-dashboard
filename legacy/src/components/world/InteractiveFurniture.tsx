'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FurnitureItem, DomainId } from './world-layout';
import { domains } from './world-layout';

interface InteractiveFurnitureProps {
  item: FurnitureItem;
  domain: DomainId;
  tileSize: number;
  index: number;
}

const FURNITURE_INFO: Record<FurnitureItem['type'], { label: string; description: string }> = {
  desk:            { label: 'Workstation', description: 'Agent workspace for focused work' },
  monitor:         { label: 'Monitor', description: 'Dashboard and metrics display' },
  whiteboard:      { label: 'Whiteboard', description: 'Brainstorming and planning area' },
  plant:           { label: 'Plant', description: 'A touch of nature for the office' },
  coffee:          { label: 'Coffee Machine', description: 'Essential fuel station' },
  bookshelf:       { label: 'Bookshelf', description: 'Knowledge library and references' },
  serverRack:      { label: 'Server Rack', description: 'Computing infrastructure' },
  camera:          { label: 'Camera', description: 'Recording and streaming setup' },
  chartBoard:      { label: 'Chart Board', description: 'Data visualization display' },
  rug:             { label: 'Rug', description: 'Comfortable zone marker' },
  lamp:            { label: 'Floor Lamp', description: 'Ambient lighting' },
  couch:           { label: 'Couch', description: 'Casual meeting and break spot' },
  meetingTable:    { label: 'Meeting Table', description: 'Team collaboration area' },
  waterCooler:     { label: 'Water Cooler', description: 'Hydration and chat station' },
  printer:         { label: 'Printer', description: 'Document output station' },
  stickyWall:      { label: 'Sticky Notes Wall', description: 'Kanban board and ideas tracker' },
  cabinet:         { label: 'File Cabinet', description: 'Document storage' },
  projectorScreen: { label: 'Projector Screen', description: 'Presentations and demos' },
};

const FURNITURE_SIZES: Record<FurnitureItem['type'], { w: number; h: number }> = {
  desk: { w: 48, h: 36 },
  monitor: { w: 42, h: 36 },
  whiteboard: { w: 48, h: 42 },
  plant: { w: 30, h: 42 },
  coffee: { w: 24, h: 30 },
  bookshelf: { w: 48, h: 48 },
  serverRack: { w: 32, h: 48 },
  camera: { w: 36, h: 32 },
  chartBoard: { w: 44, h: 40 },
  rug: { w: 80, h: 48 },
  lamp: { w: 20, h: 44 },
  couch: { w: 56, h: 30 },
  meetingTable: { w: 64, h: 44 },
  waterCooler: { w: 24, h: 44 },
  printer: { w: 40, h: 32 },
  stickyWall: { w: 56, h: 44 },
  cabinet: { w: 32, h: 44 },
  projectorScreen: { w: 60, h: 44 },
};

export function InteractiveFurniture({ item, domain, tileSize, index }: InteractiveFurnitureProps) {
  const [hovered, setHovered] = useState(false);
  const info = FURNITURE_INFO[item.type];
  const size = FURNITURE_SIZES[item.type];
  const d = domains[domain];

  // Non-interactive items
  if (item.type === 'rug' || item.type === 'lamp' || item.type === 'plant') {
    return null;
  }

  return (
    <div
      className="absolute cursor-pointer"
      style={{
        left: item.x * tileSize,
        top: item.y * tileSize,
        width: size.w,
        height: size.h,
        zIndex: item.y + 3, // above furniture SVG
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover highlight overlay */}
      <AnimatePresence>
        {hovered && (
          <>
            <motion.div
              className="absolute inset-0 rounded-md pointer-events-none"
              style={{
                border: `1.5px solid ${d.tileColor}66`,
                background: `${d.tileColor}11`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />

            {/* Tooltip */}
            <motion.div
              className="absolute pointer-events-none z-[45]"
              style={{
                bottom: size.h + 6,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
            >
              <div
                className="rounded-md px-2 py-1 whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="text-[8px] font-semibold text-foreground-primary font-mono">
                  {info.label}
                </div>
                <div className="text-[7px] text-foreground-tertiary font-mono">
                  {info.description}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
