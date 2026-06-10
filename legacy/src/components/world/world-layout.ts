// World layout configuration — room positions, domain grouping, colors

import {
  type LucideIcon,
  FileText,
  DollarSign,
  Wrench,
  Palette,
  BarChart3,
  Settings,
  Clapperboard,
  Newspaper,
  PenTool,
  Smartphone,
  Megaphone,
  Link,
  Handshake,
  Search,
  Monitor,
  Brain,
  Target,
  TrendingUp,
  Landmark,
  Library,
  ClipboardList,
  Globe,
  LifeBuoy,
  SearchCheck,
} from 'lucide-react';

export type DomainId = 'content' | 'sales' | 'dev' | 'design' | 'data' | 'ops';

export interface DomainConfig {
  id: DomainId;
  label: string;
  tileColor: string;
  tileBorder: string;
  agentColor: string;
  floorColor: string;
  icon: LucideIcon;
}

export interface RoomConfig {
  squadId: string;
  label: string;
  domain: DomainId;
  gridX: number;
  gridY: number;
  icon: LucideIcon;
}

export const domains: Record<DomainId, DomainConfig> = {
  content: {
    id: 'content',
    label: 'Content & Marketing',
    tileColor: '#FF6B6B',
    tileBorder: '#E05555',
    agentColor: '#FFD93D',
    floorColor: '#FFF0F0',
    icon: FileText,
  },
  sales: {
    id: 'sales',
    label: 'Sales & Ads',
    tileColor: '#FF9F43',
    tileBorder: '#E88A30',
    agentColor: '#FECA57',
    floorColor: '#FFF5EB',
    icon: DollarSign,
  },
  dev: {
    id: 'dev',
    label: 'Product & Dev',
    tileColor: '#54A0FF',
    tileBorder: '#3D8AE8',
    agentColor: '#48DBFB',
    floorColor: '#EBF3FF',
    icon: Wrench,
  },
  design: {
    id: 'design',
    label: 'Design',
    tileColor: '#FF6B81',
    tileBorder: '#E8556B',
    agentColor: '#FF9FF3',
    floorColor: '#FFF0F3',
    icon: Palette,
  },
  data: {
    id: 'data',
    label: 'Data & Strategy',
    tileColor: '#A29BFE',
    tileBorder: '#8B84E8',
    agentColor: '#DDA0DD',
    floorColor: '#F3F0FF',
    icon: BarChart3,
  },
  ops: {
    id: 'ops',
    label: 'Operations',
    tileColor: '#2ED573',
    tileBorder: '#22C05E',
    agentColor: '#7BED9F',
    floorColor: '#EDFFF3',
    icon: Settings,
  },
};

// Room positions on the isometric world grid
// Grouped by domain clusters
export const rooms: RoomConfig[] = [
  // Content & Marketing cluster (top-left)
  { squadId: 'youtube-content', label: 'YouTube Content', domain: 'content', gridX: 1, gridY: 0, icon: Clapperboard },
  { squadId: 'content-ecosystem', label: 'Content Ecosystem', domain: 'content', gridX: 2, gridY: 0, icon: Newspaper },
  { squadId: 'copywriting', label: 'Copywriting', domain: 'content', gridX: 0, gridY: 1, icon: PenTool },
  { squadId: 'creative-studio', label: 'Creative Studio', domain: 'design', gridX: 1, gridY: 1, icon: Palette },
  { squadId: 'social-publisher', label: 'Social Publisher', domain: 'content', gridX: 2, gridY: 1, icon: Smartphone },

  // Sales & Ads cluster (top-right)
  { squadId: 'media-buy', label: 'Media Buy', domain: 'sales', gridX: 4, gridY: 0, icon: Megaphone },
  { squadId: 'funnel-creator', label: 'Funnel Creator', domain: 'sales', gridX: 5, gridY: 0, icon: Link },
  { squadId: 'sales', label: 'Sales', domain: 'sales', gridX: 4, gridY: 1, icon: Handshake },
  { squadId: 'deep-scraper', label: 'Deep Scraper', domain: 'sales', gridX: 5, gridY: 1, icon: Search },

  // Product & Dev cluster (bottom-left)
  { squadId: 'full-stack-dev', label: 'Full Stack Dev', domain: 'dev', gridX: 0, gridY: 3, icon: Monitor },
  { squadId: 'aios-core-dev', label: 'AIOS Core Dev', domain: 'dev', gridX: 1, gridY: 3, icon: Brain },
  { squadId: 'design-system', label: 'Design System', domain: 'design', gridX: 2, gridY: 3, icon: Target },

  // Data & Strategy cluster (bottom-right)
  { squadId: 'data-analytics', label: 'Data Analytics', domain: 'data', gridX: 4, gridY: 3, icon: TrendingUp },
  { squadId: 'conselho', label: 'Conselho', domain: 'data', gridX: 5, gridY: 3, icon: Landmark },
  { squadId: 'infoproduct-creation', label: 'Infoproduct', domain: 'data', gridX: 4, gridY: 4, icon: Library },

  // Operations cluster (center-bottom)
  { squadId: 'project-management-clickup', label: 'Project Mgmt', domain: 'ops', gridX: 1, gridY: 5, icon: ClipboardList },
  { squadId: 'orquestrador-global', label: 'Orquestrador', domain: 'ops', gridX: 2, gridY: 5, icon: Globe },
  { squadId: 'support', label: 'Support', domain: 'ops', gridX: 3, gridY: 5, icon: LifeBuoy },
  { squadId: 'seo', label: 'SEO', domain: 'ops', gridX: 4, gridY: 5, icon: SearchCheck },
];

// Furniture templates per domain type — rich environments
export type FurnitureType =
  | 'desk' | 'monitor' | 'whiteboard' | 'plant' | 'coffee' | 'bookshelf'
  | 'serverRack' | 'camera' | 'chartBoard' | 'rug' | 'lamp' | 'couch'
  | 'meetingTable' | 'waterCooler' | 'printer' | 'stickyWall' | 'cabinet' | 'projectorScreen';

export interface FurnitureItem {
  type: FurnitureType;
  x: number; // tile position within room
  y: number;
}

// 20x14 room — generous space for agents + rich environments
export const furnitureTemplates: Record<DomainId, FurnitureItem[]> = {
  content: [
    // Rugs (background)
    { type: 'rug', x: 5, y: 4 },
    { type: 'rug', x: 12, y: 8 },
    // Wall-adjacent items (below wall zone)
    { type: 'projectorScreen', x: 6, y: 2 },
    { type: 'stickyWall', x: 14, y: 2 },
    { type: 'camera', x: 0, y: 2 },
    { type: 'plant', x: 19, y: 2 },
    // Work zone (left)
    { type: 'desk', x: 1, y: 3 },
    { type: 'desk', x: 4, y: 3 },
    { type: 'monitor', x: 1, y: 5 },
    // Meeting zone (center)
    { type: 'meetingTable', x: 8, y: 5 },
    { type: 'whiteboard', x: 12, y: 3 },
    // Break zone (right)
    { type: 'couch', x: 15, y: 6 },
    { type: 'coffee', x: 19, y: 4 },
    { type: 'waterCooler', x: 19, y: 7 },
    // Bottom row
    { type: 'bookshelf', x: 0, y: 10 },
    { type: 'lamp', x: 5, y: 12 },
    { type: 'printer', x: 15, y: 12 },
    { type: 'cabinet', x: 19, y: 11 },
    { type: 'plant', x: 10, y: 13 },
  ],
  sales: [
    { type: 'rug', x: 6, y: 5 },
    { type: 'rug', x: 13, y: 9 },
    // Wall-adjacent items (below wall zone)
    { type: 'chartBoard', x: 4, y: 2 },
    { type: 'projectorScreen', x: 10, y: 2 },
    { type: 'stickyWall', x: 16, y: 2 },
    { type: 'plant', x: 0, y: 2 },
    // Work zone
    { type: 'desk', x: 1, y: 3 },
    { type: 'desk', x: 4, y: 3 },
    { type: 'monitor', x: 7, y: 3 },
    { type: 'monitor', x: 14, y: 3 },
    // Meeting
    { type: 'meetingTable', x: 8, y: 6 },
    { type: 'whiteboard', x: 0, y: 6 },
    // Lounge
    { type: 'couch', x: 15, y: 7 },
    { type: 'coffee', x: 19, y: 5 },
    { type: 'waterCooler', x: 19, y: 8 },
    // Bottom
    { type: 'bookshelf', x: 0, y: 11 },
    { type: 'lamp', x: 6, y: 12 },
    { type: 'printer', x: 14, y: 12 },
    { type: 'cabinet', x: 19, y: 12 },
    { type: 'plant', x: 10, y: 13 },
  ],
  dev: [
    { type: 'rug', x: 6, y: 5 },
    { type: 'rug', x: 14, y: 9 },
    // Wall-adjacent items (below wall zone)
    { type: 'serverRack', x: 0, y: 2 },
    { type: 'serverRack', x: 2, y: 2 },
    { type: 'projectorScreen', x: 6, y: 2 },
    { type: 'stickyWall', x: 14, y: 2 },
    // Work zone — dev workstations
    { type: 'desk', x: 1, y: 4 },
    { type: 'desk', x: 4, y: 4 },
    { type: 'monitor', x: 7, y: 4 },
    { type: 'monitor', x: 10, y: 4 },
    { type: 'monitor', x: 15, y: 4 },
    // Meeting / pairing
    { type: 'meetingTable', x: 8, y: 7 },
    { type: 'whiteboard', x: 0, y: 7 },
    // Break zone
    { type: 'couch', x: 15, y: 8 },
    { type: 'coffee', x: 19, y: 5 },
    { type: 'waterCooler', x: 19, y: 8 },
    // Bottom
    { type: 'bookshelf', x: 0, y: 11 },
    { type: 'bookshelf', x: 19, y: 2 },
    { type: 'lamp', x: 5, y: 12 },
    { type: 'printer', x: 14, y: 12 },
    { type: 'cabinet', x: 19, y: 12 },
    { type: 'plant', x: 10, y: 13 },
    { type: 'plant', x: 0, y: 13 },
  ],
  design: [
    { type: 'rug', x: 5, y: 5 },
    { type: 'rug', x: 13, y: 8 },
    // Wall-adjacent items (below wall zone)
    { type: 'stickyWall', x: 2, y: 2 },
    { type: 'projectorScreen', x: 9, y: 2 },
    { type: 'camera', x: 17, y: 2 },
    { type: 'plant', x: 0, y: 2 },
    // Work zone
    { type: 'desk', x: 1, y: 4 },
    { type: 'desk', x: 5, y: 4 },
    { type: 'monitor', x: 9, y: 4 },
    { type: 'monitor', x: 14, y: 3 },
    // Creative zone
    { type: 'whiteboard', x: 0, y: 7 },
    { type: 'meetingTable', x: 7, y: 7 },
    // Lounge
    { type: 'couch', x: 15, y: 7 },
    { type: 'couch', x: 0, y: 11 },
    { type: 'coffee', x: 19, y: 5 },
    { type: 'waterCooler', x: 19, y: 8 },
    // Bottom
    { type: 'bookshelf', x: 19, y: 11 },
    { type: 'lamp', x: 6, y: 12 },
    { type: 'lamp', x: 14, y: 12 },
    { type: 'plant', x: 10, y: 13 },
    { type: 'plant', x: 19, y: 2 },
  ],
  data: [
    { type: 'rug', x: 5, y: 5 },
    { type: 'rug', x: 13, y: 9 },
    // Wall-adjacent items (below wall zone)
    { type: 'chartBoard', x: 2, y: 2 },
    { type: 'chartBoard', x: 8, y: 2 },
    { type: 'projectorScreen', x: 13, y: 2 },
    { type: 'serverRack', x: 19, y: 2 },
    { type: 'plant', x: 0, y: 2 },
    // Work zone
    { type: 'desk', x: 1, y: 4 },
    { type: 'desk', x: 5, y: 4 },
    { type: 'monitor', x: 9, y: 4 },
    { type: 'monitor', x: 14, y: 4 },
    { type: 'monitor', x: 17, y: 4 },
    // Analysis zone
    { type: 'meetingTable', x: 7, y: 7 },
    { type: 'whiteboard', x: 0, y: 7 },
    // Break zone
    { type: 'couch', x: 15, y: 8 },
    { type: 'coffee', x: 19, y: 5 },
    { type: 'waterCooler', x: 19, y: 8 },
    // Bottom
    { type: 'bookshelf', x: 0, y: 11 },
    { type: 'lamp', x: 5, y: 12 },
    { type: 'printer', x: 14, y: 12 },
    { type: 'cabinet', x: 19, y: 12 },
    { type: 'plant', x: 10, y: 13 },
  ],
  ops: [
    { type: 'rug', x: 5, y: 5 },
    { type: 'rug', x: 13, y: 9 },
    // Wall-adjacent items (below wall zone)
    { type: 'serverRack', x: 0, y: 2 },
    { type: 'projectorScreen', x: 5, y: 2 },
    { type: 'stickyWall', x: 13, y: 2 },
    { type: 'monitor', x: 19, y: 2 },
    // Work zone
    { type: 'desk', x: 1, y: 4 },
    { type: 'desk', x: 5, y: 4 },
    { type: 'monitor', x: 9, y: 4 },
    { type: 'monitor', x: 14, y: 4 },
    // Ops center
    { type: 'meetingTable', x: 7, y: 7 },
    { type: 'whiteboard', x: 0, y: 7 },
    { type: 'chartBoard', x: 16, y: 3 },
    // Break zone
    { type: 'couch', x: 15, y: 8 },
    { type: 'coffee', x: 19, y: 5 },
    { type: 'waterCooler', x: 19, y: 8 },
    // Bottom
    { type: 'bookshelf', x: 0, y: 11 },
    { type: 'lamp', x: 5, y: 12 },
    { type: 'printer', x: 14, y: 12 },
    { type: 'cabinet', x: 19, y: 12 },
    { type: 'plant', x: 0, y: 13 },
    { type: 'plant', x: 10, y: 13 },
  ],
};

// Grid constants — world map isometric tiles (not room interior tiles)
export const TILE_WIDTH = 140;
export const TILE_HEIGHT = 70;
export const ROOM_COLS = 20;
export const ROOM_ROWS = 14;
