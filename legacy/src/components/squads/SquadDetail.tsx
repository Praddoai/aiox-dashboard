'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionLabel } from '@/components/ui/section-label';
import { Users, FileText, GitBranch, CheckCircle2 } from 'lucide-react';
import { formatSquadScore, formatSquadVersion, getScoreColor } from '@/lib/squad-metadata';
import { getDomainColor, getDomainLabel, getDomainBg, getDomainBorder } from '@/lib/domain-taxonomy';
import { SquadTierTree } from './SquadTierTree';
import { SquadSectionGrid } from './SquadSectionGrid';
import { SquadItemViewer } from './SquadItemViewer';
import { useSquadDetail } from '@/hooks/use-squads';
import type { Squad } from '@/types';

type TabId = 'overview' | 'agents' | 'tasks' | 'workflows' | 'checklists' | 'templates' | 'data';

interface TabDef {
  id: TabId;
  label: string;
  section?: string; // maps to API section name
  countKey?: keyof Squad;
}

const TAB_DEFS: TabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'agents', label: 'Agents', section: 'agents', countKey: 'agentCount' },
  { id: 'tasks', label: 'Tasks', section: 'tasks', countKey: 'taskCount' },
  { id: 'workflows', label: 'Workflows', section: 'workflows', countKey: 'workflowCount' },
  { id: 'checklists', label: 'Checklists', section: 'checklists', countKey: 'checklistCount' },
  { id: 'templates', label: 'Templates', section: 'templates', countKey: 'templateCount' },
  { id: 'data', label: 'Data', section: 'data', countKey: 'dataCount' },
];

interface SquadDetailProps {
  squadName: string;
  onAgentClick?: (agentId: string) => void;
  selectedItem: { section: string; slug: string } | null;
  onItemClick: (section: string, slug: string) => void;
  onItemBack: () => void;
  breadcrumb?: ReactNode;
}

export function SquadDetail({ squadName, onAgentClick, selectedItem, onItemClick, onItemBack, breadcrumb }: SquadDetailProps) {
  const { squad, isLoading, isError } = useSquadDetail(squadName);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Compute visible tabs early so keyboard handler can reference them
  const visibleTabs = squad
    ? TAB_DEFS.filter((tab) => {
        if (tab.id === 'overview') return true;
        if (!tab.countKey) return true;
        return (squad[tab.countKey] as number) > 0;
      })
    : TAB_DEFS;

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = visibleTabs.findIndex((t) => t.id === activeTab);
      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % visibleTabs.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = visibleTabs.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        setActiveTab(visibleTabs[nextIndex].id);
        requestAnimationFrame(() => activeTabRef.current?.focus());
      }
    },
    [activeTab, visibleTabs]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-label text-text-muted uppercase tracking-wider">
          Loading squad...
        </span>
      </div>
    );
  }

  if (isError || !squad) {
    return (
      <div className="p-6">
        {breadcrumb}
        <p className="text-label text-status-error">
          Failed to load squad &quot;{squadName}&quot;
        </p>
      </div>
    );
  }

  // If viewing an item, show the item viewer
  if (selectedItem) {
    return (
      <SquadItemViewer
        squadName={squadName}
        section={selectedItem.section}
        slug={selectedItem.slug}
        breadcrumb={breadcrumb}
      />
    );
  }

  const domainColor = getDomainColor(squad.domain);
  const domainBg = getDomainBg(squad.domain);
  const domainBorder = getDomainBorder(squad.domain);
  const extSquad = squad as Squad & { objectives?: string[]; keyCapabilities?: string[] };

  const currentTab = TAB_DEFS.find((t) => t.id === activeTab);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-3xl">
        {/* Breadcrumb */}
        {breadcrumb}

        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-light text-text-primary">
            {squad.displayName}
          </h2>
          <span
            className="text-caption uppercase tracking-wider font-medium px-2 py-0.5 border"
            style={{
              backgroundColor: domainBg,
              borderColor: domainBorder,
              color: domainColor,
            }}
          >
            {getDomainLabel(squad.domain)}
          </span>
          <span
            className="text-caption font-mono text-text-disabled ml-auto"
            title={`Version ${formatSquadVersion(squad.version)}`}
          >
            {formatSquadVersion(squad.version)}
          </span>
        </div>

        {/* Description */}
        {squad.description && (
          <p className="text-label text-text-secondary leading-relaxed mb-6 whitespace-pre-line">
            {squad.description.trim()}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
          <StatIcon icon={Users} label="Agents" value={squad.agentCount} />
          <StatIcon icon={FileText} label="Tasks" value={squad.taskCount} />
          {squad.workflowCount > 0 && (
            <StatIcon icon={GitBranch} label="Workflows" value={squad.workflowCount} />
          )}
          {squad.checklistCount > 0 && (
            <StatIcon icon={CheckCircle2} label="Checklists" value={squad.checklistCount} />
          )}
          <div className="ml-auto">
            <ScoreRing score={squad.score} />
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Squad sections"
          className="flex items-center gap-1 mb-6 overflow-x-auto pb-px border-b border-border"
          onKeyDown={handleTabKeyDown}
        >
          {visibleTabs.map((tab) => {
            const count = tab.countKey ? (squad[tab.countKey] as number) : null;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : undefined}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-detail uppercase tracking-wider font-medium whitespace-nowrap transition-colors',
                  'border-b-2 -mb-px',
                  isActive
                    ? 'border-gold text-gold'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                )}
              >
                {tab.label}
                {count !== null && count > 0 && (
                  <span className="ml-1.5 font-mono text-caption opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'overview' ? (
            <OverviewContent squad={extSquad} onAgentClick={onAgentClick} />
          ) : currentTab?.section ? (
            <SquadSectionGrid
              squadName={squadName}
              section={currentTab.section}
              onItemClick={(slug) => {
                onItemClick(currentTab.section!, slug);
              }}
              onAgentClick={onAgentClick}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OverviewContent({
  squad,
  onAgentClick,
}: {
  squad: Squad & { objectives?: string[]; keyCapabilities?: string[] };
  onAgentClick?: (agentId: string) => void;
}) {
  return (
    <>
      {/* Objectives */}
      {squad.objectives && squad.objectives.length > 0 && (
        <div className="mb-8">
          <SectionLabel withLine className="mb-3">Objectives</SectionLabel>
          <ul className="space-y-1.5 ml-1">
            {squad.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-label text-text-secondary">
                <span className="text-gold mt-0.5 shrink-0">-</span>
                <span className="leading-relaxed">{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dependencies */}
      {squad.dependencies.length > 0 && (
        <div className="mb-8">
          <SectionLabel withLine className="mb-3">Dependencies</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {squad.dependencies.map((dep) => (
              <span
                key={`${dep.from}-${dep.to}`}
                className={cn(
                  'text-detail px-2 py-1 border',
                  dep.type === 'required'
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-border text-text-muted'
                )}
              >
                {dep.to}
                {dep.type === 'optional' && ' (optional)'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tier Tree */}
      <div className="mb-8">
        <SectionLabel withLine className="mb-4">Agent Hierarchy</SectionLabel>
        <SquadTierTree tiers={squad.tiers || []} onAgentClick={onAgentClick} />
      </div>
    </>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = getScoreColor(score);
  const pct = (score / 10) * 100;
  const circ = 2 * Math.PI * 14;
  const offset = circ - (pct / 100) * circ;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 w-9 h-9"
      title={`Score: ${formatSquadScore(score)}/10`}
    >
      <svg width="36" height="36" viewBox="0 0 32 32" className="-rotate-90">
        <circle cx="16" cy="16" r="14" fill="none" stroke="var(--border-subtle)" strokeWidth="2.5" />
        <circle
          cx="16" cy="16" r="14"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span
        className="absolute text-detail font-mono font-medium"
        style={{ color }}
      >
        {formatSquadScore(score)}
      </span>
    </div>
  );
}

function StatIcon({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <Icon className="h-3.5 w-3.5 text-text-muted" />
      <span className="text-sm font-mono text-text-primary">{value}</span>
      <span className="text-detail uppercase tracking-wider text-text-muted">{label}</span>
    </div>
  );
}
