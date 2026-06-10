import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Shield,
  Bot,
  Settings,
  Server,
  FileText,
  File,
} from 'lucide-react';
import { GlassCard, Badge, StatusDot } from '../ui';

// --- Mock Data ---

const activeRules = [
  { name: 'vault-lookup', type: 'mandatory' as const, path: '.claude/rules/vault-lookup.md' },
  { name: 'memory-system', type: 'mandatory' as const, path: '.claude/rules/memory-system.md' },
  { name: 'portuguese-accents', type: 'mandatory' as const, path: '.claude/rules/portuguese-accents.md' },
  { name: 'clickup-tracking', type: 'mandatory' as const, path: '.claude/rules/clickup-tracking.md' },
  { name: 'design-system-usage', type: 'optional' as const, path: '.claude/rules/design-system-usage.md' },
  { name: 'naming-convention', type: 'mandatory' as const, path: '.claude/rules/naming-convention.md' },
];

const agentDefinitions = [
  { name: 'Dex', role: 'Full Stack Developer', model: 'sonnet', icon: 'dev' },
  { name: 'Quinn', role: 'Quality Assurance', model: 'sonnet', icon: 'qa' },
  { name: 'Atlas', role: 'System Architect', model: 'opus', icon: 'architect' },
  { name: 'River', role: 'Scrum Master', model: 'haiku', icon: 'sm' },
  { name: 'Sage', role: 'Product Owner', model: 'sonnet', icon: 'po' },
  { name: 'Gage', role: 'DevOps Engineer', model: 'sonnet', icon: 'devops' },
  { name: 'Aria', role: 'Business Analyst', model: 'sonnet', icon: 'analyst' },
];

const configFiles = [
  { path: '.aios-core/core-config.yaml', modified: '2h ago' },
  { path: '.claude/CLAUDE.md', modified: '1d ago' },
  { path: '.synapse/manifest', modified: '3h ago' },
  { path: '.aios-core/constitution.md', modified: '5d ago' },
  { path: 'tsconfig.json', modified: '1d ago' },
];

const mcpServers = [
  { name: 'clickup', status: 'success' as const, tools: 12 },
  { name: 'supabase', status: 'success' as const, tools: 8 },
  { name: 'meta-ads', status: 'success' as const, tools: 12 },
  { name: 'google-drive', status: 'success' as const, tools: 31 },
  { name: 'qdrant', status: 'error' as const, tools: 2 },
  { name: 'supermemory', status: 'success' as const, tools: 4 },
  { name: 'waha', status: 'success' as const, tools: 63 },
  { name: 'hotmart', status: 'offline' as const, tools: 9 },
];

const recentFiles = [
  { path: 'src/components/insights/InsightsView.tsx', time: '5m ago' },
  { path: 'src/components/qa/QAMetrics.tsx', time: '8m ago' },
  { path: 'src/stores/roadmapStore.ts', time: '12m ago' },
  { path: 'src/components/context/ContextView.tsx', time: '15m ago' },
  { path: 'src/components/github/GitHubView.tsx', time: '18m ago' },
  { path: 'src/App.tsx', time: '25m ago' },
  { path: 'src/components/layout/Sidebar.tsx', time: '30m ago' },
  { path: 'src/types/index.ts', time: '45m ago' },
  { path: 'src/index.css', time: '1h ago' },
  { path: 'package.json', time: '2h ago' },
];

// --- Collapsible Section ---

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, count, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <GlassCard padding="none" className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-secondary">{icon}</span>
          <span className="text-sm font-semibold text-primary">{title}</span>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-white/10 text-[10px] font-medium text-tertiary">
            {count}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown size={16} className="text-tertiary" />
        ) : (
          <ChevronRight size={16} className="text-tertiary" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// --- Main Component ---

export default function ContextView() {
  return (
    <div className="h-full overflow-y-auto glass-scrollbar p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain size={22} className="text-purple-400" />
        <h1 className="text-xl font-semibold text-primary">Context</h1>
        <Badge variant="default" size="sm">aios-platform</Badge>
      </div>

      {/* Active Rules */}
      <CollapsibleSection title="Active Rules" icon={<Shield size={16} />} count={activeRules.length}>
        {activeRules.map((rule) => (
          <div key={rule.name} className="flex items-center justify-between glass-subtle rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-tertiary" />
              <span className="text-sm text-primary">{rule.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="status"
                status={rule.type === 'mandatory' ? 'error' : 'warning'}
                size="sm"
              >
                {rule.type}
              </Badge>
              <span className="text-[10px] text-tertiary hidden sm:inline">{rule.path}</span>
            </div>
          </div>
        ))}
      </CollapsibleSection>

      {/* Agent Definitions */}
      <CollapsibleSection title="Agent Definitions" icon={<Bot size={16} />} count={agentDefinitions.length}>
        {agentDefinitions.map((agent) => (
          <div key={agent.name} className="flex items-center justify-between glass-subtle rounded-lg px-3 py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                <Bot size={12} className="text-blue-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-primary">{agent.name}</span>
                <span className="text-xs text-secondary ml-2">{agent.role}</span>
              </div>
            </div>
            <Badge variant="default" size="sm">{agent.model}</Badge>
          </div>
        ))}
      </CollapsibleSection>

      {/* Config Files */}
      <CollapsibleSection title="Config Files" icon={<Settings size={16} />} count={configFiles.length}>
        {configFiles.map((file) => (
          <div key={file.path} className="flex items-center justify-between glass-subtle rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <File size={12} className="text-tertiary" />
              <span className="text-xs text-primary font-mono">{file.path}</span>
            </div>
            <span className="text-[10px] text-tertiary">{file.modified}</span>
          </div>
        ))}
      </CollapsibleSection>

      {/* MCP Servers */}
      <CollapsibleSection title="MCP Servers" icon={<Server size={16} />} count={mcpServers.length}>
        {mcpServers.map((server) => (
          <div key={server.name} className="flex items-center justify-between glass-subtle rounded-lg px-3 py-2">
            <div className="flex items-center gap-2.5">
              <StatusDot
                status={server.status === 'success' ? 'success' : server.status === 'error' ? 'error' : 'offline'}
                size="sm"
              />
              <span className="text-sm text-primary">{server.name}</span>
            </div>
            <Badge variant="default" size="sm">{server.tools} tools</Badge>
          </div>
        ))}
      </CollapsibleSection>

      {/* Recent Files */}
      <CollapsibleSection title="Recent Files" icon={<FileText size={16} />} count={recentFiles.length} defaultOpen={false}>
        {recentFiles.map((file) => (
          <div key={file.path} className="flex items-center justify-between glass-subtle rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-tertiary" />
              <span className="text-xs text-primary font-mono truncate max-w-[300px]">{file.path}</span>
            </div>
            <span className="text-[10px] text-tertiary flex-shrink-0">{file.time}</span>
          </div>
        ))}
      </CollapsibleSection>
    </div>
  );
}
