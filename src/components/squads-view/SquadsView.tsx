import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  ChevronLeft,
  Bot,
  LayoutGrid,
  GitBranch,
  Network,
} from 'lucide-react';
import { GlassCard, GlassButton, GlassInput, Badge, StatusDot, SectionLabel, Avatar } from '../ui';
import { SquadOrgChart } from '../squads/SquadOrgChart';
import { AgentDetailPanel } from '../squads/AgentDetailPanel';
import { ConnectionsMap } from '../squads/ConnectionsMap';
import { SquadStatsPanel } from '../squads/SquadStatsPanel';
import { useSquads, useSquadStats, useSquadConnections } from '../../hooks/useSquads';
import { useAgents, useAgent } from '../../hooks/useAgents';
import { cn } from '../../lib/utils';
import { hasAgentAvatar, getSquadImageUrl } from '../../lib/agent-avatars';
import { getSquadType } from '../../types';
import type { Squad, AgentSummary, Agent } from '../../types';

// --- Domain Groups ---

interface DomainGroup {
  name: string;
  squadIds: string[];
}

const domainGroups: DomainGroup[] = [
  {
    name: 'Content & Marketing',
    squadIds: ['youtube-content', 'content-ecosystem', 'copywriting', 'creative-studio', 'social-publisher'],
  },
  {
    name: 'Sales & Ads',
    squadIds: ['sales', 'media-buy', 'funnel-creator', 'deep-scraper'],
  },
  {
    name: 'Product & Dev',
    squadIds: ['full-stack-dev', 'aios-core-dev', 'design-system', 'infoproduct-creation'],
  },
  {
    name: 'Data & Strategy',
    squadIds: ['data-analytics', 'conselho', 'seo'],
  },
  {
    name: 'Operations',
    squadIds: ['project-management-clickup', 'orquestrador-global', 'support'],
  },
];

// --- Placeholder squads for when API returns empty ---

const placeholderSquads: Squad[] = [
  { id: 'full-stack-dev', name: 'Full Stack Dev', description: 'Development team', agentCount: 10, status: 'active' },
  { id: 'copywriting', name: 'Copywriting', description: 'Content writing team', agentCount: 8, status: 'active' },
  { id: 'creative-studio', name: 'Creative Studio', description: 'Design and creative assets', agentCount: 12, status: 'active' },
  { id: 'media-buy', name: 'Media Buy', description: 'Advertising campaigns', agentCount: 6, status: 'active' },
  { id: 'data-analytics', name: 'Data Analytics', description: 'Analytics and reporting', agentCount: 7, status: 'active' },
  { id: 'content-ecosystem', name: 'Content Ecosystem', description: 'Content management', agentCount: 14, status: 'busy' },
  { id: 'project-management-clickup', name: 'Project Management', description: 'ClickUp integration', agentCount: 5, status: 'active' },
  { id: 'orquestrador-global', name: 'Global Orchestrator', description: 'Cross-squad coordination', agentCount: 3, status: 'active' },
];

// --- Placeholder agents ---

const placeholderAgents: AgentSummary[] = [
  { id: 'chief', name: 'Chief', tier: 0, squad: '', title: 'Squad Chief', description: 'Orchestrates squad operations' },
  { id: 'specialist-1', name: 'Specialist A', tier: 2, squad: '', title: 'Specialist', description: 'Domain specialist' },
  { id: 'specialist-2', name: 'Specialist B', tier: 2, squad: '', title: 'Specialist', description: 'Domain specialist' },
  { id: 'master-1', name: 'Master', tier: 1, squad: '', title: 'Master Agent', description: 'Master agent' },
];

// --- Tier config ---

const tierConfig = {
  0: { label: 'Orchestrator', color: 'text-purple-400', bg: 'bg-purple-500/15' },
  1: { label: 'Master', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  2: { label: 'Specialist', color: 'text-green-400', bg: 'bg-green-500/15' },
} as const;

// --- Tab types ---
type SquadTab = 'overview' | 'orgchart' | 'connections';

const squadTabs: Array<{ id: SquadTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
  { id: 'orgchart', label: 'Org Chart', icon: <GitBranch size={14} /> },
  { id: 'connections', label: 'Connections', icon: <Network size={14} /> },
];

// --- Main Component ---

export default function SquadsView() {
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SquadTab>('overview');

  const { data: squadsData } = useSquads();
  const { data: agentsData } = useAgents(selectedSquadId);
  const { data: squadStats } = useSquadStats(selectedSquadId);
  const { data: fullAgent } = useAgent(selectedSquadId, selectedAgentId);
  const { data: connections = [] } = useSquadConnections(selectedSquadId);

  const squads = squadsData && squadsData.length > 0 ? squadsData : placeholderSquads;
  const agents = agentsData && agentsData.length > 0 ? agentsData : placeholderAgents.map((a) => ({ ...a, squad: selectedSquadId || '' }));

  const selectedSquad = squads.find((s) => s.id === selectedSquadId);
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Filter squads by search
  const filteredSquads = useMemo(() => {
    if (!searchQuery) return squads;
    const q = searchQuery.toLowerCase();
    return squads.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q),
    );
  }, [squads, searchQuery]);

  // Group squads by domain
  const groupedSquads = useMemo(() => {
    return domainGroups.map((group) => ({
      ...group,
      squads: filteredSquads.filter((s) => group.squadIds.includes(s.id)),
    })).filter((g) => g.squads.length > 0);
  }, [filteredSquads]);

  // Ungrouped squads
  const groupedIds = domainGroups.flatMap((g) => g.squadIds);
  const ungrouped = filteredSquads.filter((s) => !groupedIds.includes(s.id));

  const navigateToSquad = (squadId: string) => {
    setSelectedSquadId(squadId);
    setActiveTab('overview');
    setLevel(2);
  };

  const navigateToAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setLevel(3);
  };

  const goBack = () => {
    if (level === 3) {
      setSelectedAgentId(null);
      setLevel(2);
    } else if (level === 2) {
      setSelectedSquadId(null);
      setLevel(1);
    }
  };

  // --- Level 1: Organogram ---
  if (level === 1) {
    return (
      <div className="h-full overflow-y-auto glass-scrollbar p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-cyan-400" />
          <h1 className="text-xl font-semibold text-primary">Squads</h1>
          <Badge variant="count" size="sm">{squads.length}</Badge>
        </div>

        <GlassInput
          placeholder="Search squads..."
          leftIcon={<Search size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {groupedSquads.map((group) => (
          <div key={group.name}>
            <SectionLabel count={group.squads.length}>{group.name}</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.squads.map((squad, i) => (
                <GlassCard
                  key={squad.id}
                  padding="md"
                  interactive
                  className="cursor-pointer"
                  onClick={() => navigateToSquad(squad.id)}
                  motionProps={{ transition: { delay: i * 0.03 } }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSquadImageUrl(squad.id) ? (
                        <img
                          src={getSquadImageUrl(squad.id)}
                          alt={squad.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                          <Users size={16} className="text-cyan-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-primary">{squad.name}</p>
                        <p className="text-[10px] text-tertiary font-mono">{squad.id}</p>
                      </div>
                    </div>
                    <StatusDot
                      status={squad.status === 'active' ? 'success' : squad.status === 'busy' ? 'waiting' : 'offline'}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default" size="sm">{squad.agentCount} agents</Badge>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div>
            <SectionLabel count={ungrouped.length}>Other Squads</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ungrouped.map((squad) => (
                <GlassCard
                  key={squad.id}
                  padding="md"
                  interactive
                  className="cursor-pointer"
                  onClick={() => navigateToSquad(squad.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSquadImageUrl(squad.id) ? (
                        <img
                          src={getSquadImageUrl(squad.id)}
                          alt={squad.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-500/15 flex items-center justify-center">
                          <Users size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-primary">{squad.name}</p>
                        <p className="text-[10px] text-tertiary font-mono">{squad.id}</p>
                      </div>
                    </div>
                    <StatusDot status="idle" size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default" size="sm">{squad.agentCount} agents</Badge>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Level 2: Squad Detail with Tabs ---
  if (level === 2 && selectedSquad) {
    return (
      <div className="h-full overflow-y-auto glass-scrollbar p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <GlassButton size="sm" variant="ghost" onClick={goBack} leftIcon={<ChevronLeft size={14} />}>
            Squads
          </GlassButton>
          <span className="text-tertiary text-sm">/</span>
          <span className="text-sm text-primary font-medium">{selectedSquad.name}</span>
        </div>

        {/* Squad Header */}
        <GlassCard padding="lg">
          <div className="flex items-center gap-4">
            {getSquadImageUrl(selectedSquad.id) ? (
              <img
                src={getSquadImageUrl(selectedSquad.id)}
                alt={selectedSquad.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Users size={24} className="text-cyan-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-primary">{selectedSquad.name}</h2>
              <p className="text-sm text-secondary">{selectedSquad.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default" size="sm">{selectedSquad.agentCount} agents</Badge>
                <StatusDot
                  status={selectedSquad.status === 'active' ? 'success' : 'waiting'}
                  size="sm"
                  label={selectedSquad.status || 'active'}
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 p-1 glass-subtle rounded-xl w-fit" role="tablist" aria-label="Abas do squad">
          {squadTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                activeTab === tab.id
                  ? 'glass text-primary'
                  : 'text-tertiary hover:text-secondary',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <SquadStatsPanel stats={squadStats} />

            {/* Agent List */}
            <SectionLabel count={agents.length}>Agents</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map((agent, i) => {
                const tier = tierConfig[agent.tier as 0 | 1 | 2] || tierConfig[2];
                return (
                  <GlassCard
                    key={agent.id}
                    padding="md"
                    interactive
                    className="cursor-pointer"
                    onClick={() => navigateToAgent(agent.id)}
                    motionProps={{ transition: { delay: i * 0.03 } }}
                  >
                    <div className="flex items-center gap-3">
                      {hasAgentAvatar(agent.name) || hasAgentAvatar(agent.id) ? (
                        <Avatar
                          name={agent.name}
                          agentId={agent.id}
                          size="lg"
                          squadType={getSquadType(agent.squad)}
                        />
                      ) : (
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tier.bg)}>
                          <Bot size={18} className={tier.color} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary">{agent.name}</p>
                        <p className="text-xs text-secondary truncate">{agent.title || 'Agent'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default" size="sm" className={tier.bg}>
                        <span className={tier.color}>{tier.label}</span>
                      </Badge>
                      <StatusDot status="success" size="sm" />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'orgchart' && (
          <SquadOrgChart agents={agents} />
        )}

        {activeTab === 'connections' && (
          <ConnectionsMap agents={agents} connections={connections} />
        )}
      </div>
    );
  }

  // --- Level 3: Agent Detail ---
  if (level === 3 && selectedAgent && selectedSquad) {
    return (
      <div className="h-full overflow-y-auto glass-scrollbar p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 flex-wrap">
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() => { setSelectedAgentId(null); setLevel(2); }}
            leftIcon={<ChevronLeft size={14} />}
          >
            {selectedSquad.name}
          </GlassButton>
          <span className="text-tertiary text-sm">/</span>
          <span className="text-sm text-primary font-medium">{selectedAgent.name}</span>
        </div>

        <AgentDetailPanel
          agent={fullAgent || {
            id: selectedAgent.id,
            name: selectedAgent.name,
            tier: selectedAgent.tier,
            squad: selectedAgent.squad,
            title: selectedAgent.title,
            description: selectedAgent.description,
          } as Agent}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="h-full flex items-center justify-center">
      <GlassCard padding="lg" className="text-center">
        <p className="text-primary text-lg font-semibold">Squads</p>
        <p className="text-secondary text-sm mt-1">No data available</p>
        <GlassButton size="sm" className="mt-3" onClick={() => { setLevel(1); setSelectedSquadId(null); setSelectedAgentId(null); }}>
          Go back
        </GlassButton>
      </GlassCard>
    </div>
  );
}
