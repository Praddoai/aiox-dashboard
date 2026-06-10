// AIOS Dashboard Types - PRD v1.4
// Professional design system - no emojis, icon names only

import type { IconName } from '@/lib/icons';
import * as React from 'react';

// ============ Story Types ============

export type StoryStatus =
  | 'backlog'
  | 'in_progress'
  | 'ai_review'
  | 'human_review'
  | 'pr_created'
  | 'done'
  | 'error';

export type StoryComplexity = 'simple' | 'standard' | 'complex';
export type StoryPriority = 'low' | 'medium' | 'high' | 'critical';
export type StoryCategory = 'feature' | 'fix' | 'refactor' | 'docs';
export type StoryType = 'epic' | 'story';

export interface Story {
  id: string;
  title: string;
  description: string;
  status: StoryStatus;
  type?: StoryType; // 'story' if not specified

  // Classification
  epicId?: string;
  complexity?: StoryComplexity;
  priority?: StoryPriority;
  category?: StoryCategory;

  // Agent association
  agentId?: AgentId;
  progress?: number;

  // Content
  acceptanceCriteria?: string[];
  technicalNotes?: string;

  // Metadata
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Agent Types ============

export type AgentId = 'dev' | 'qa' | 'architect' | 'pm' | 'po' | 'analyst' | 'devops';

export type AgentStatus = 'idle' | 'working' | 'waiting' | 'error';

export type AgentPhase = 'planning' | 'coding' | 'testing' | 'reviewing' | 'deploying';

export interface Agent {
  id: AgentId;
  name: string;
  icon: IconName;
  color: string;
  status: AgentStatus;
  currentStoryId?: string;
  phase?: AgentPhase;
  progress?: number;
  lastActivity?: string;
}

// ============ Project Types ============

export interface Project {
  id: string;
  name: string;
  path: string;
}

// ============ Status Types ============

export interface AiosStatus {
  version: string;
  updatedAt: string;
  connected: boolean;
  project: {
    name: string;
    path: string;
  } | null;
  activeAgent: {
    id: AgentId;
    name: string;
    activatedAt: string;
    currentStory?: string;
  } | null;
  session: {
    startedAt: string;
    commandsExecuted: number;
    lastCommand?: string;
  } | null;
  stories: {
    inProgress: string[];
    completed: string[];
  };
  rateLimit?: {
    used: number;
    limit: number;
    resetsAt?: string;
  };
}

// ============ Terminal Types ============

export type TerminalStatus = 'idle' | 'running' | 'error';

export interface TerminalSession {
  id: string;
  agentId: AgentId;
  name: string;
  model: string;
  apiType: string;
  workingDirectory: string;
  status: TerminalStatus;
  currentCommand?: string;
  storyId?: string;
}

// ============ Roadmap Types ============

export type RoadmapPriority = 'must_have' | 'should_have' | 'could_have' | 'wont_have';
export type RoadmapImpact = 'low' | 'medium' | 'high';
export type RoadmapEffort = 'low' | 'medium' | 'high';

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  priority: RoadmapPriority;
  impact: RoadmapImpact;
  effort: RoadmapEffort;
  category?: StoryCategory;
  tags?: string[];
  linkedStoryId?: string;
}

export const ROADMAP_PRIORITY_CONFIG: Record<RoadmapPriority, { label: string; color: string }> = {
  must_have: { label: 'Must Have', color: 'red' },
  should_have: { label: 'Should Have', color: 'yellow' },
  could_have: { label: 'Could Have', color: 'blue' },
  wont_have: { label: "Won't Have", color: 'gray' },
};

// ============ Squad Types ============

export type SquadStatus = 'active' | 'draft' | 'beta' | 'planned';

export interface SquadAgent {
  id: string;
  name: string;
  role: string;
  tier: string;
  description?: string;
}

export interface SquadTier {
  key: string;
  name: string;
  purpose: string;
  agents: SquadAgent[];
  level: number; // 0=orchestrator, 1=tier_0/tier_1, 2=tier_2
}

export interface SquadConnection {
  from: string;
  to: string;
  type: 'required' | 'optional';
  reason?: string;
}

export interface Squad {
  name: string;
  displayName: string;
  description: string;
  version: string;
  score: number;
  domain: string;
  status: SquadStatus;
  path: string;
  agentCount: number;
  taskCount: number;
  workflowCount: number;
  checklistCount: number;
  templateCount: number;
  dataCount: number;
  agentNames: string[];
  tiers?: SquadTier[];
  dependencies: SquadConnection[];
  keywords: string[];
}

// ============ Sidebar Types ============

export type SidebarView =
  | 'kanban'
  | 'agents'
  | 'bob'
  | 'terminals'
  | 'monitor'
  | 'roadmap'
  | 'context'
  | 'ideas'
  | 'insights'
  | 'github'
  | 'worktrees'
  | 'squads'
  | 'sales-room'
  | 'settings';

export interface SidebarItem {
  id: SidebarView;
  label: string;
  icon: IconName;
  href: string;
  shortcut?: string;
}

// ============ Kanban Column Types ============

export interface KanbanColumn {
  id: StoryStatus;
  label: string;
  icon: IconName;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', label: 'Backlog', icon: 'file-text', color: 'gray' },
  { id: 'in_progress', label: 'In Progress', icon: 'play', color: 'blue' },
  { id: 'ai_review', label: 'AI Review', icon: 'bot', color: 'purple' },
  { id: 'human_review', label: 'Human Review', icon: 'user', color: 'yellow' },
  { id: 'pr_created', label: 'PR Created', icon: 'git-pull-request', color: 'cyan' },
  { id: 'done', label: 'Done', icon: 'check-circle', color: 'green' },
  { id: 'error', label: 'Error', icon: 'x-circle', color: 'red' },
];

// ============ Agent Config ============

export interface AgentConfig {
  name: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
}

export const AGENT_CONFIG: Record<AgentId, AgentConfig> = {
  dev: { name: 'Dev', icon: 'code', color: 'var(--agent-dev)', bg: 'var(--agent-dev-bg)', border: 'var(--agent-dev-border)' },
  qa: { name: 'QA', icon: 'test-tube', color: 'var(--agent-qa)', bg: 'var(--agent-qa-bg)', border: 'var(--agent-qa-border)' },
  architect: { name: 'Architect', icon: 'building', color: 'var(--agent-architect)', bg: 'var(--agent-architect-bg)', border: 'var(--agent-architect-border)' },
  pm: { name: 'PM', icon: 'bar-chart', color: 'var(--agent-pm)', bg: 'var(--agent-pm-bg)', border: 'var(--agent-pm-border)' },
  po: { name: 'PO', icon: 'target', color: 'var(--agent-po)', bg: 'var(--agent-po-bg)', border: 'var(--agent-po-border)' },
  analyst: { name: 'Analyst', icon: 'line-chart', color: 'var(--agent-analyst)', bg: 'var(--agent-analyst-bg)', border: 'var(--agent-analyst-border)' },
  devops: { name: 'DevOps', icon: 'wrench', color: 'var(--agent-devops)', bg: 'var(--agent-devops-bg)', border: 'var(--agent-devops-border)' },
};

// ============ Sidebar Config ============

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'kanban', label: 'Kanban', icon: 'kanban', href: '/kanban', shortcut: 'K' },
  { id: 'agents', label: 'Agents', icon: 'bot', href: '/agents', shortcut: 'A' },
  { id: 'bob', label: 'Bob', icon: 'bot', href: '/bob', shortcut: 'B' },
  { id: 'terminals', label: 'Terminals', icon: 'terminal', href: '/terminals', shortcut: 'T' },
  { id: 'monitor', label: 'Monitor', icon: 'activity', href: '/monitor', shortcut: 'M' },
  { id: 'insights', label: 'Insights', icon: 'trending-up', href: '/insights', shortcut: 'I' },
  { id: 'context', label: 'Context', icon: 'brain', href: '/context', shortcut: 'C' },
  { id: 'roadmap', label: 'Roadmap', icon: 'map', href: '/roadmap', shortcut: 'R' },
  { id: 'squads', label: 'Squads', icon: 'network', href: '/squads', shortcut: 'Q' },
  { id: 'sales-room', label: 'Sales Room', icon: 'eye', href: '/sales-room', shortcut: 'L' },
  { id: 'github', label: 'GitHub', icon: 'github', href: '/github', shortcut: 'G' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings', shortcut: 'S' },
];

// ============ Status Colors (semantic) ============

export const STATUS_COLORS: Record<StoryStatus, string> = {
  backlog: 'text-muted-foreground',
  in_progress: 'text-status-info',
  ai_review: 'text-phase-review',
  human_review: 'text-status-warning',
  pr_created: 'text-phase-pr',
  done: 'text-status-success',
  error: 'text-status-error',
};

export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-status-idle',
  working: 'bg-status-success',
  waiting: 'bg-status-warning',
  error: 'bg-status-error',
};

// ============================================================================
// PLATFORM TYPES (merged from aios-platform)
// These types power the platform API layer, chat, execution, monitoring, etc.
// For conflicting names, platform versions use the "Platform" prefix.
// ============================================================================

// ------------ Squad Classification Types ------------

export type SquadType =
  | 'copywriting'    // orange
  | 'design'         // purple
  | 'creator'        // green
  | 'orchestrator'   // cyan
  | 'content'        // red
  | 'development'    // blue
  | 'engineering'    // indigo
  | 'analytics'      // teal
  | 'marketing'      // pink
  | 'advisory'       // yellow
  | 'default';       // gray

// Map squad IDs to SquadTypes for UI styling (updated 2026-02-24)
export const squadTypeMap: Record<string, SquadType> = {
  // Marketing & Copy (orange)
  'copywriting': 'copywriting',
  // Sales & Funnels (blue)
  'media-buy': 'development',
  'funnel-creator': 'development',
  // Sales (green)
  'sales': 'creator',
  // Creative & Design (purple)
  'design-system': 'design',
  'creative-studio': 'design',
  // Engineering (indigo)
  'full-stack-dev': 'engineering',
  'aios-core-dev': 'engineering',
  // Content & YouTube (red)
  'content-ecosystem': 'content',
  'youtube-lives': 'content',
  // Data & Research (teal)
  'data-analytics': 'analytics',
  // Scraping & Outreach (pink)
  'deep-scraper': 'marketing',
  // Strategy & Advisory (yellow)
  'conselho': 'advisory',
  'infoproduct-creation': 'advisory',
  // System & Orchestration (cyan)
  'project-management-clickup': 'orchestrator',
  'orquestrador-global': 'orchestrator',
  'squad-creator': 'orchestrator',
  'operations-hub': 'orchestrator',
  'docs': 'orchestrator',
  // Natalia Tanaka (orange)
  'communication-natalia-tanaka': 'copywriting',
  'community-natalia-tanaka': 'copywriting',
  'strategy-natalia-tanaka': 'copywriting',
};

// Pattern-based squad type mapping (for sub-squads and new squads)
const squadTypePatterns: Array<{ pattern: RegExp; type: SquadType }> = [
  { pattern: /natalia-tanaka/i, type: 'copywriting' },
  { pattern: /youtube/i, type: 'content' },
  { pattern: /copywriting|copy/i, type: 'copywriting' },
  { pattern: /media-buy|funnel/i, type: 'development' },
  { pattern: /design|ui|ux|creative|studio/i, type: 'design' },
  { pattern: /dev|full-stack|frontend|backend|aios-core/i, type: 'engineering' },
  { pattern: /content|ecosystem/i, type: 'content' },
  { pattern: /data|analytics/i, type: 'analytics' },
  { pattern: /scraper|deep-/i, type: 'marketing' },
  { pattern: /conselho|advisor|infoproduct/i, type: 'advisory' },
  { pattern: /orquestrador|orchestrator|system|project-management/i, type: 'orchestrator' },
  { pattern: /comercial|sales|vendas/i, type: 'creator' },
  { pattern: /community|comunidade/i, type: 'orchestrator' },
  { pattern: /communication|comunicacao/i, type: 'copywriting' },
];

export function getSquadType(squadId: string): SquadType {
  // First try exact match
  if (squadTypeMap[squadId]) {
    return squadTypeMap[squadId];
  }

  // Then try pattern matching
  for (const { pattern, type } of squadTypePatterns) {
    if (pattern.test(squadId)) {
      return type;
    }
  }

  return 'default';
}

// ------------ Platform Squad (different shape from dashboard Squad) ------------

export interface PlatformSquad {
  id: string;
  name: string;
  description: string;
  domain?: string;
  icon?: string;
  agentCount: number;
  // UI-only fields
  type?: SquadType;
  status?: 'active' | 'busy' | 'inactive';
  capabilities?: string[];
}

export interface SquadDetail extends PlatformSquad {
  agents: AgentSummary[];
  config?: Record<string, unknown>;
}

export interface SquadStats {
  squadId: string;
  stats: {
    totalAgents: number;
    byTier: Record<string, number>;
    quality: {
      withVoiceDna: number;
      withAntiPatterns: number;
      withIntegration: number;
    };
    commands: {
      total: number;
      byAgent: Array<{ agentId: string; count: number }>;
    };
    qualityScore: number;
  };
}

export interface EcosystemOverview {
  totalSquads: number;
  totalAgents: number;
  squads: Array<{
    id: string;
    name: string;
    icon?: string;
    domain?: string;
    agentCount: number;
    tiers: {
      orchestrators: number;
      masters: number;
      specialists: number;
    };
  }>;
}

// ------------ Platform Agent Types (different shape from dashboard Agent) ------------

export type AgentTier = 0 | 1 | 2; // 0=Orchestrator, 1=Master, 2=Specialist

export interface AgentSummary {
  id: string;
  name: string;
  title?: string;
  icon?: string;
  tier: AgentTier;
  squad: string;
  description?: string;
  whenToUse?: string;
  commandCount?: number;
}

export interface AgentCommand {
  command: string;
  action: string;
  description?: string;
}

export interface AgentPersona {
  role?: string;
  style?: string;
  identity?: string;
  background?: string;
  focus?: string;
}

export interface PlatformAgent extends AgentSummary {
  persona?: AgentPersona;
  corePrinciples?: string[];
  commands?: AgentCommand[];
  mindSource?: {
    name?: string;
    credentials?: string[];
    frameworks?: string[];
  };
  voiceDna?: {
    sentenceStarters?: string[];
    vocabulary?: {
      alwaysUse?: string[];
      neverUse?: string[];
    };
  };
  antiPatterns?: {
    neverDo?: string[];
  };
  integration?: {
    receivesFrom?: string[];
    handoffTo?: string[];
  };
  quality?: {
    hasVoiceDna: boolean;
    hasAntiPatterns: boolean;
    hasIntegration: boolean;
  };
  // UI-only fields (mapped from backend)
  squadId?: string;
  squadType?: SquadType;
  role?: string;
  status?: 'online' | 'busy' | 'offline';
  capabilities?: string[];
  model?: string;
  lastActive?: string;
  executionCount?: number;
}

// ------------ Message Types ------------

export type MessageRole = 'user' | 'agent' | 'system';

export interface MessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'audio' | 'video';
  mimeType: string;
  size: number;
  url?: string;
  data?: string;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  agentId?: string;
  agentName?: string;
  squadId?: string;
  squadType?: SquadType;
  timestamp: string;
  isStreaming?: boolean;
  attachments?: MessageAttachment[];
  metadata?: {
    provider?: string;
    model?: string;
    usage?: TokenUsage;
    duration?: number;
    [key: string]: unknown;
  };
}

// ------------ Chat Types ------------

export interface ChatSession {
  id: string;
  agentId: string;
  agentName: string;
  agentSquad?: SquadType;
  squadId: string;
  squadType: SquadType;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// ------------ Execution Types ------------

export interface ExecuteRequest {
  squadId: string;
  agentId: string;
  input: {
    message: string;
    context?: Record<string, unknown>;
    command?: string;
  };
  options?: {
    async?: boolean;
    timeout?: number;
    stream?: boolean;
  };
}

export interface ExecuteResult {
  agentId: string;
  agentName: string;
  message: string;
  commandExecuted?: boolean;
  command?: string;
  metadata: {
    squad: string;
    tier: AgentTier;
    provider: string;
    model: string;
    usage: TokenUsage;
    duration: number;
    processedAt: string;
  };
}

export interface ExecuteResponse {
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: ExecuteResult;
  statusUrl?: string;
  error?: string;
}

export interface ExecutionRecord {
  id: string;
  agentId: string;
  squadId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  input?: {
    message?: string;
    context?: Record<string, unknown>;
  };
  result?: ExecuteResult;
  error?: {
    code: string;
    message: string;
  };
  tokensUsed?: number;
  duration?: number;
}

export interface ExecutionHistory {
  executions: ExecutionRecord[];
  total: number;
}

export interface ExecutionStats {
  total: number;
  byStatus: Record<string, number>;
  bySquad: Record<string, number>;
  byAgent: Record<string, number>;
}

// ------------ Token Usage Types ------------

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LLMUsage {
  claude: {
    input: number;
    output: number;
    requests: number;
  };
  openai: {
    input: number;
    output: number;
    requests: number;
  };
  total: {
    input: number;
    output: number;
    requests: number;
  };
}

export interface LLMHealth {
  claude: {
    available: boolean;
    error?: string;
  };
  openai: {
    available: boolean;
    error?: string;
  };
}

export interface LLMModels {
  claude: string[];
  openai: string[];
  default: {
    fast: string;
    default: string;
    powerful: string;
  };
}

// ------------ MCP Types ------------

export interface MCPServer {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
  resources: MCPResource[];
  lastPing?: string;
  error?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  calls: number;
  lastUsed?: string;
  avgDuration?: number;
  successRate?: number;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  accessCount: number;
}

export interface MCPStats {
  totalServers: number;
  connectedServers: number;
  totalTools: number;
  totalToolCalls: number;
  topTools: Array<{ name: string; server: string; calls: number }>;
}

// ------------ Cost Estimation Types ------------

export interface CostEstimate {
  provider: 'claude' | 'openai';
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface CostSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  byProvider: {
    claude: number;
    openai: number;
  };
  bySquad: Record<string, number>;
  trend: number[]; // Daily costs for last 7 days
}

// ------------ System Metrics Types ------------

export interface SystemMetrics {
  uptime: number; // seconds
  avgLatency: number; // ms
  requestsPerMinute: number;
  errorRate: number; // percentage
  queueSize: number;
  activeConnections: number;
}

export interface HealthStatus {
  api: { healthy: boolean; latency: number };
  database: { healthy: boolean; latency: number };
  llm: { healthy: boolean; providers: { claude: boolean; openai: boolean } };
  mcp: { healthy: boolean; connectedServers: number };
}

// ------------ Agent Activity Types ------------

export interface AgentActivityEntry {
  id: string;
  agentId: string;
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  duration: number;
}

export interface AgentAnalytics {
  agentId: string;
  agentName: string;
  squad: string;
  totalExecutions: number;
  successRate: number;
  avgResponseTime: number;
  avgTokens: number;
  topCommands: Array<{ command: string; count: number }>;
  lastActive: string;
}

export interface CommandAnalytics {
  command: string;
  agentId: string;
  totalCalls: number;
  successRate: number;
  avgDuration: number;
}

// ------------ Orchestration Types ------------

export interface OrchestrationStep {
  squadId: string;
  agentId: string;
  input?: {
    message?: string;
    context?: Record<string, unknown>;
  };
  dependsOn?: string[];
}

export interface OrchestrationRequest {
  workflow: OrchestrationStep[];
  options?: {
    mode?: 'sequential' | 'parallel' | 'dag';
    stopOnError?: boolean;
  };
}

export interface OrchestrationResult {
  orchestrationId: string;
  status: 'completed' | 'failed';
  mode: string;
  results: Array<{
    stepIndex: number;
    agentId: string;
    executionId: string;
    status: string;
    result?: ExecuteResult;
  }>;
  error?: string;
}

// ------------ SSE Stream Events ------------

export interface StreamStartEvent {
  executionId: string;
  agentId: string;
  agentName: string;
}

export interface StreamTextEvent {
  content: string;
}

export interface StreamDoneEvent {
  usage: TokenUsage;
  duration: number;
}

export interface StreamErrorEvent {
  error: string;
}

export interface StreamToolsEvent {
  step?: number;
  agentId?: string;
  toolsUsed: boolean;
  toolResults: Array<{
    tool: string;
    input?: unknown;
    output?: unknown;
    success: boolean;
    error?: string;
  }>;
}

// ------------ API Types ------------

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export interface ApiListResponse<T> {
  data?: T[];
  total: number;
}

// ------------ Platform UI Types ------------

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

export interface SearchFilters {
  query?: string;
  squad?: string;
  tier?: AgentTier;
  limit?: number;
}

export interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

export type PlatformViewType =
  | 'chat' | 'dashboard' | 'settings' | 'orchestrator' | 'world'
  | 'kanban' | 'agents' | 'bob' | 'terminals' | 'monitor'
  | 'insights' | 'context' | 'roadmap' | 'squads' | 'github' | 'qa' | 'stories';

export type PlatformSettingsSectionType = 'dashboard' | 'categories' | 'memory' | 'workflows' | 'profile' | 'api' | 'appearance' | 'notifications' | 'privacy' | 'about';

export interface PlatformUIState {
  sidebarCollapsed: boolean;
  activityPanelOpen: boolean;
  workflowViewOpen: boolean;
  agentExplorerOpen: boolean;
  mobileMenuOpen: boolean;
  theme: 'light' | 'dark' | 'system' | 'matrix' | 'glass';
  selectedSquadId: string | null;
  selectedAgentId: string | null;
  currentView: PlatformViewType;
  settingsSection: PlatformSettingsSectionType;
  selectedRoomId: string | null;
  worldZoom: 'map' | 'room';
}
