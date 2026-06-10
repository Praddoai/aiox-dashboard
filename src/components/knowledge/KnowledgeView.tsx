import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  LayoutGrid,
  FolderTree,
  GitFork,
  Users,
  FileText,
  Folder,
  HardDrive,
  ChevronDown,
  ChevronRight,
  FlaskConical,
} from 'lucide-react';
import { GlassCard, GlassButton, Badge } from '../ui';
import { cn } from '../../lib/utils';
import {
  useKnowledgeOverview,
  useAgentKnowledge,
  useKnowledgeSearch,
  formatFileSize,
  FILE_TYPE_COLORS,
} from '../../hooks/useKnowledge';
import { KnowledgeSearch } from './KnowledgeSearch';
import { KnowledgeFileExplorer } from './KnowledgeFileExplorer';
import { KnowledgeContentViewer } from './KnowledgeContentViewer';
import { KnowledgeGraph } from './KnowledgeGraph';

// ── Types ──

type TabId = 'overview' | 'explorer' | 'graph' | 'agents';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'explorer', label: 'Explorer', icon: FolderTree },
  { id: 'graph', label: 'Graph', icon: GitFork },
  { id: 'agents', label: 'Agentes', icon: Users },
];

// ── Overview Tab ──

function OverviewTab({
  overview,
  recentFilesFiltered,
  onSelectFile,
}: {
  overview: ReturnType<typeof useKnowledgeOverview>['data'];
  recentFilesFiltered: ReturnType<typeof useKnowledgeSearch>['recentFilesFiltered'];
  onSelectFile: (path: string) => void;
}) {
  const stats = useMemo(() => [
    { label: 'Arquivos', value: overview?.totalFiles ?? 0, icon: FileText, color: 'text-blue-400' },
    { label: 'Pastas', value: overview?.totalDirectories ?? 0, icon: Folder, color: 'text-yellow-400' },
    { label: 'Tamanho Total', value: formatFileSize(overview?.totalSize ?? 0), icon: HardDrive, color: 'text-green-400' },
  ], [overview]);

  const topExtensions = useMemo(() => {
    if (!overview?.byExtension) return [];
    return Object.entries(overview.byExtension)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [overview]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <GlassCard key={s.label} className="flex items-center gap-3 !py-3">
            <s.icon size={20} className={s.color} />
            <div>
              <p className="text-lg font-semibold text-primary">{s.value}</p>
              <p className="text-xs text-tertiary">{s.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* File types */}
        <GlassCard className="space-y-3">
          <h3 className="text-sm font-semibold text-primary">Tipos de Arquivo</h3>
          {topExtensions.length > 0 ? (
            <div className="space-y-2">
              {topExtensions.map(([ext, count]) => (
                <div key={ext} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', FILE_TYPE_COLORS[ext] ? 'bg-current' : 'bg-gray-500')} />
                    <span className={cn('text-xs font-mono', FILE_TYPE_COLORS[ext] || 'text-gray-400')}>.{ext}</span>
                  </div>
                  <span className="text-xs text-tertiary">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-tertiary">Nenhum arquivo encontrado</p>
          )}
        </GlassCard>

        {/* Recent files */}
        <GlassCard className="space-y-3">
          <h3 className="text-sm font-semibold text-primary">Arquivos Recentes</h3>
          {recentFilesFiltered.length > 0 ? (
            <div className="space-y-1">
              {recentFilesFiltered.slice(0, 10).map((file) => (
                <button
                  key={file.path}
                  onClick={() => onSelectFile(file.path)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left hover:bg-white/5 transition-colors group"
                >
                  <FileText size={12} className={FILE_TYPE_COLORS[file.extension] || 'text-gray-400'} />
                  <span className="text-xs text-primary truncate flex-1">{file.name}</span>
                  <span className="text-[10px] text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatFileSize(file.size)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-tertiary">Nenhum arquivo recente</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

// ── Agents Tab ──

function AgentsTab({
  agentsBySquad,
  squads,
}: {
  agentsBySquad: Record<string, ReturnType<typeof useAgentKnowledge>['data']>;
  squads: ReturnType<typeof useAgentKnowledge>['squads'];
}) {
  const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());

  const toggleSquad = (id: string) => {
    setExpandedSquads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const squadEntries = Object.entries(agentsBySquad);

  if (squadEntries.length === 0) {
    return (
      <GlassCard className="flex items-center justify-center py-12">
        <div className="text-center">
          <Users size={32} className="mx-auto mb-2 text-tertiary opacity-30" />
          <p className="text-sm text-secondary">Nenhum agente com knowledge</p>
          <p className="text-xs text-tertiary mt-1">Agentes com pastas de conhecimento aparecerão aqui</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-2">
      {squadEntries.map(([squadId, agents]) => {
        const squad = squads?.find((s: { id: string }) => s.id === squadId);
        const isExpanded = expandedSquads.has(squadId);
        const agentList = agents || [];

        return (
          <GlassCard key={squadId} className="!p-0 overflow-hidden">
            <button
              onClick={() => toggleSquad(squadId)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown size={14} className="text-tertiary" /> : <ChevronRight size={14} className="text-tertiary" />}
                <Users size={14} className="text-green-400" />
                <span className="text-sm font-medium text-primary">{squad?.name || squadId}</span>
                <Badge variant="subtle" size="sm">{agentList.length} agentes</Badge>
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-glass-border p-2 space-y-1">
                    {agentList.map((agent) => (
                      <div key={agent.agentId} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-green-400">
                              {agent.agentName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-primary">{agent.agentName}</p>
                            {agent.knowledgePath && (
                              <p className="text-[10px] text-tertiary font-mono">{agent.knowledgePath}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {agent.files !== undefined && (
                            <Badge variant="subtle" size="sm">{agent.files} arquivos</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        );
      })}
    </div>
  );
}

// ── Main View ──

export default function KnowledgeView() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [explorerPath, setExplorerPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading, isMock: isOverviewMock } = useKnowledgeOverview();
  const { data: agentKnowledge, agentsBySquad, squads, isMock: isAgentsMock } = useAgentKnowledge();

  const isMockData = isOverviewMock || isAgentsMock;

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filterType,
    setFilterType,
    recentFilesFiltered,
    clearFilters,
  } = useKnowledgeSearch(overview);

  const availableTypes = useMemo(() => {
    if (!overview?.byExtension) return [];
    return Object.keys(overview.byExtension).sort();
  }, [overview]);

  const handleSelectFile = (path: string) => {
    setSelectedFile(path);
    if (activeTab === 'overview' || activeTab === 'graph') {
      setActiveTab('explorer');
    }
  };

  const totalAgents = agentKnowledge?.length ?? 0;

  return (
    <div className="h-full overflow-y-auto glass-scrollbar p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Database size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">Knowledge Base</h1>
            <p className="text-xs text-tertiary">Explorar e visualizar a base de conhecimento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!overviewLoading && overview && (
            <>
              <Badge variant="subtle" size="sm">{overview.totalFiles} arquivos</Badge>
              <Badge variant="subtle" size="sm">{formatFileSize(overview.totalSize)}</Badge>
              <Badge variant="subtle" size="sm">{totalAgents} agentes</Badge>
            </>
          )}
        </div>
      </div>

      {/* Mock data alert */}
      {isMockData && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <FlaskConical size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-300/80">
            Exibindo dados de demonstracao — API indisponivel ou sem dados
          </span>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <KnowledgeSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            availableTypes={availableTypes}
            onClear={clearFilters}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {TABS.map((tab) => (
            <GlassButton
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'gap-1.5 text-xs',
                activeTab === tab.id && 'bg-white/10'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={14} />
              {tab.label}
            </GlassButton>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="flex-1"
        >
          {activeTab === 'overview' && (
            <OverviewTab
              overview={overview}
              recentFilesFiltered={recentFilesFiltered}
              onSelectFile={handleSelectFile}
            />
          )}

          {activeTab === 'explorer' && (
            <div className="grid grid-cols-[320px_1fr] gap-4 min-h-[500px]">
              <KnowledgeFileExplorer
                currentPath={explorerPath}
                selectedFile={selectedFile}
                onNavigate={setExplorerPath}
                onSelectFile={setSelectedFile}
              />
              <KnowledgeContentViewer
                filePath={selectedFile}
                onClose={() => setSelectedFile(null)}
              />
            </div>
          )}

          {activeTab === 'graph' && (
            <div className="min-h-[500px] flex">
              <KnowledgeGraph
                overview={overview}
                agentKnowledge={agentKnowledge}
                agentsBySquad={agentsBySquad}
                onSelectFile={handleSelectFile}
              />
            </div>
          )}

          {activeTab === 'agents' && (
            <AgentsTab agentsBySquad={agentsBySquad} squads={squads} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Status bar */}
      <div className="flex items-center justify-between text-[10px] text-tertiary pt-2 border-t border-glass-border">
        <span>
          {overview?.totalFiles ?? 0} arquivos · {overview?.totalDirectories ?? 0} pastas · {totalAgents} agentes
        </span>
        <span>{formatFileSize(overview?.totalSize ?? 0)} total</span>
      </div>
    </div>
  );
}
