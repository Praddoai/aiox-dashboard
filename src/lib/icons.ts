import {
  type LucideIcon,
  BarChart3,
  TrendingUp,
  Target,
  Bot,
  User,
  Settings,
  Palette,
  PenTool,
  Monitor,
  Clapperboard,
  Video,
  Tv,
  FileText,
  BookOpen,
  Library,
  Lightbulb,
  Mail,
  Megaphone,
  Search,
  Microscope,
  Wrench,
  Zap,
  Flame,
  Sparkles,
  Gem,
  Star,
  Trophy,
  Puzzle,
  Link,
  RefreshCw,
  GitMerge,
  Rocket,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  Landmark,
  FlaskConical,
  Paintbrush,
  Rainbow,
  Image,
  UserCog,
  DollarSign,
  Smartphone,
  Handshake,
  Brain,
  Globe,
  PlugZap,
  Keyboard,
  Ruler,
  LifeBuoy,
  Tag,
  Anchor,
  Package,
  Swords,
  LogOut,
  Scissors,
  Newspaper,
  Eye,
  Calendar,
  SearchCheck,
  Hand,
  Users,
  Timer,
  Signal,
  Sun,
  Moon,
  Laptop,
  CircleDot,
  FolderOpen,
  ThumbsUp,
  Heart,
  PartyPopper,
  HelpCircle,
  Check,
  X,
  ArrowRight,
  Info,
  TriangleAlert,
  Cog,
} from 'lucide-react';

export type { LucideIcon };

/**
 * Icon size constants for consistent sizing across the app.
 */
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
} as const;

/**
 * Maps a string name to a Lucide icon component.
 * Used for data that persists icon names as strings (API responses, localStorage).
 */
const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  TrendingUp,
  Target,
  Bot,
  User,
  Users,
  Settings,
  Palette,
  PenTool,
  Monitor,
  Clapperboard,
  Video,
  Tv,
  FileText,
  BookOpen,
  Library,
  Lightbulb,
  Mail,
  Megaphone,
  Search,
  Microscope,
  Wrench,
  Zap,
  Flame,
  Sparkles,
  Gem,
  Star,
  Trophy,
  Puzzle,
  Link,
  RefreshCw,
  GitMerge,
  Rocket,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  Landmark,
  FlaskConical,
  Paintbrush,
  Rainbow,
  Image,
  UserCog,
  DollarSign,
  Smartphone,
  Handshake,
  Brain,
  Globe,
  PlugZap,
  Keyboard,
  Ruler,
  LifeBuoy,
  Tag,
  Anchor,
  Package,
  Swords,
  LogOut,
  Scissors,
  Newspaper,
  Eye,
  Calendar,
  SearchCheck,
  Hand,
  Timer,
  Signal,
  Cog,
};

// Emoji → Lucide icon name mapping (brandbook: no emojis, use SVG icons)
const EMOJI_TO_ICON: Record<string, string> = {
  '\u{1F916}': 'Bot',        // 🤖
  '\u{1F464}': 'User',       // 👤
  '\u{1F465}': 'Users',      // 👥
  '\u{1F3A8}': 'Palette',    // 🎨
  '\u{270D}\uFE0F': 'PenTool', // ✍️
  '\u{270D}': 'PenTool',     // ✍ (without VS16)
  '\u{1F3AC}': 'Clapperboard', // 🎬
  '\u{1F504}': 'RefreshCw',  // 🔄
  '\u{1F4FA}': 'Tv',         // 📺
  '\u{1F527}': 'Wrench',     // 🔧
  '\u{2699}\uFE0F': 'Cog',   // ⚙️
  '\u{2699}': 'Cog',         // ⚙ (without VS16)
  '\u{1F4CA}': 'BarChart3',  // 📊
  '\u{1F4E3}': 'Megaphone',  // 📣
  '\u{1F4DA}': 'BookOpen',   // 📚
  '\u{1F4E6}': 'Package',    // 📦
  '\u{1F4C2}': 'FolderOpen', // 📂
  '\u{1F4CB}': 'ClipboardList', // 📋
  '\u{1F4AC}': 'MessageSquare', // 💬
  '\u{1F30D}': 'Globe',      // 🌍
  '\u{1F30E}': 'Globe',      // 🌎
  '\u{1F30F}': 'Globe',      // 🌏
  '\u{1F310}': 'Globe',      // 🌐
  '\u{1F9E0}': 'Brain',      // 🧠
  '\u{26A1}': 'Zap',         // ⚡
  '\u{1F525}': 'Flame',      // 🔥
  '\u{1F680}': 'Rocket',     // 🚀
  '\u{1F4A1}': 'Lightbulb',  // 💡
  '\u{1F50D}': 'Search',     // 🔍
  '\u{1F50E}': 'Search',     // 🔎
  '\u{1F3AF}': 'Target',     // 🎯
  '\u{2B50}': 'Star',        // ⭐
  '\u{1F4DD}': 'FileText',   // 📝
  '\u{1F5A5}\uFE0F': 'Monitor', // 🖥️
  '\u{1F5A5}': 'Monitor',    // 🖥
  '\u{1F4BB}': 'Laptop',     // 💻
  '\u{1F4F1}': 'Smartphone', // 📱
  '\u{1F3C6}': 'Trophy',     // 🏆
  '\u{1F48E}': 'Gem',        // 💎
  '\u{2728}': 'Sparkles',    // ✨
  '\u{1F9E9}': 'Puzzle',     // 🧩
  '\u{1F517}': 'Link',       // 🔗
  '\u{2705}': 'CheckCircle', // ✅
  '\u{274C}': 'XCircle',     // ❌
  '\u{26A0}\uFE0F': 'AlertTriangle', // ⚠️
  '\u{26A0}': 'AlertTriangle', // ⚠
  '\u{1F4D0}': 'Ruler',      // 📐
  '\u{1F4C5}': 'Calendar',   // 📅
  '\u{1F4C6}': 'Calendar',   // 📆
  '\u{2702}\uFE0F': 'Scissors', // ✂️
  '\u{2702}': 'Scissors',    // ✂
  '\u{1F4F0}': 'Newspaper',  // 📰
  '\u{1F441}\uFE0F': 'Eye',  // 👁️
  '\u{1F441}': 'Eye',        // 👁
  '\u{1F4E7}': 'Mail',       // 📧
  '\u{2709}\uFE0F': 'Mail',  // ✉️
  '\u{2709}': 'Mail',        // ✉
  '\u{1F91D}': 'Handshake',  // 🤝
  '\u{1F4B0}': 'DollarSign', // 💰
  '\u{1F4B5}': 'DollarSign', // 💵
  '\u{1F3D7}\uFE0F': 'Landmark', // 🏗️
  '\u{1F3D7}': 'Landmark',   // 🏗
};

/**
 * Resolves any icon string (Lucide name or emoji) to a LucideIcon component.
 */
export function getIconComponent(name: string): LucideIcon {
  // Check if it's a known Lucide icon name first
  if (ICON_MAP[name]) return ICON_MAP[name];
  // Check emoji mapping
  const mapped = EMOJI_TO_ICON[name];
  if (mapped && ICON_MAP[mapped]) return ICON_MAP[mapped];
  return Bot;
}

// ── Semantic icon aliases (replace emojis across the app) ──

/** Theme selector icons */
export const ThemeIcons = {
  light: Sun,
  dark: Moon,
  system: Laptop,
  matrix: CircleDot,
  glass: Sparkles,
  aiox: Zap,
} as const;

/** Category default icon */
export const CategoryIcon = FolderOpen;

/** Emote icons for world/game interactions */
export const EmoteIcons = {
  wave: Hand,
  thumbsUp: ThumbsUp,
  love: Heart,
  celebrate: PartyPopper,
  thinking: HelpCircle,
  lightning: Zap,
  fire: Flame,
  idea: Lightbulb,
} as const;

export type EmoteKey = keyof typeof EmoteIcons;

export const EMOTE_LIST: Array<{ key: EmoteKey; label: string; Icon: LucideIcon }> = [
  { key: 'wave', label: 'Wave', Icon: Hand },
  { key: 'thumbsUp', label: 'Thumbs up', Icon: ThumbsUp },
  { key: 'love', label: 'Love', Icon: Heart },
  { key: 'celebrate', label: 'Celebrate', Icon: PartyPopper },
  { key: 'thinking', label: 'Thinking', Icon: HelpCircle },
  { key: 'lightning', label: 'Lightning', Icon: Zap },
  { key: 'fire', label: 'Fire', Icon: Flame },
  { key: 'idea', label: 'Idea', Icon: Lightbulb },
];

/** Export chat role icons */
export const ExportRoleIcons = {
  user: User,
  agent: Bot,
  system: Cog,
} as const;

/** Inline status marks */
export const StatusMark = {
  check: Check,
  cross: X,
} as const;

/** Workflow empty-state icons */
export const WorkflowPlaceholderIcons = {
  noWorkflows: RefreshCw,
  noExecutions: ClipboardList,
} as const;

/** Notification type icons */
export const NotificationTypeIcons = {
  info: Info,
  success: Check,
  warning: TriangleAlert,
  task: ArrowRight,
} as const;

/** Misc semantic icons */
export const SemanticIcons = {
  toolUse: Wrench,
  whenToUse: Lightbulb,
} as const;
