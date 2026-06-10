'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Network, RefreshCw, Loader2, Search } from '@/lib/icons';
import { useSquads } from '@/hooks/use-squads';
import { useSquadStore } from '@/stores/squad-store';
import { SquadOrganogram } from './SquadOrganogram';
import { SquadDetail } from './SquadDetail';
import { SquadAgentDetail } from './SquadAgentDetail';
import { SquadBreadcrumb, type BreadcrumbSegment } from './SquadBreadcrumb';

export function SquadsPanel() {
  const { squads, domainIndex, summary, isLoading, refresh } =
    useSquads();
  const { selectedSquad, setSelectedSquad } = useSquadStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ section: string; slug: string } | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter squads based on query
  const filteredSquads = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return squads;
    return squads.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q)
    );
  }, [squads, filterQuery]);

  // Build filtered domainIndex
  const filteredDomainIndex = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return domainIndex;
    const filteredNames = new Set(filteredSquads.map((s) => s.name));
    const result: Record<string, string[]> = {};
    for (const [domain, names] of Object.entries(domainIndex)) {
      const filtered = names.filter((n) => filteredNames.has(n));
      if (filtered.length > 0) result[domain] = filtered;
    }
    return result;
  }, [domainIndex, filteredSquads, filterQuery]);

  // "/" keyboard shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !selectedSquad &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedSquad]);

  const handleSquadClick = useCallback(
    (name: string) => {
      setSelectedSquad(name);
      setSelectedAgent(null);
      setSelectedItem(null);
    },
    [setSelectedSquad]
  );

  const navigateToOrganogram = useCallback(() => {
    setSelectedSquad(null);
    setSelectedAgent(null);
    setSelectedItem(null);
  }, [setSelectedSquad]);

  const navigateToSquad = useCallback(() => {
    setSelectedAgent(null);
    setSelectedItem(null);
  }, []);

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgent(agentId);
    setSelectedItem(null);
  }, []);

  const handleItemClick = useCallback((section: string, slug: string) => {
    setSelectedItem({ section, slug });
  }, []);

  const handleItemBack = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Build breadcrumb segments
  const breadcrumbSegments: BreadcrumbSegment[] = [];
  if (selectedSquad) {
    breadcrumbSegments.push({ label: 'Squads', onClick: navigateToOrganogram });
    const squad = squads.find((s) => s.name === selectedSquad);
    const squadLabel = squad?.displayName || selectedSquad;

    if (selectedAgent) {
      breadcrumbSegments.push({ label: squadLabel, onClick: navigateToSquad });
      breadcrumbSegments.push({ label: selectedAgent });
    } else if (selectedItem) {
      breadcrumbSegments.push({ label: squadLabel, onClick: navigateToSquad });
      breadcrumbSegments.push({ label: selectedItem.section, onClick: handleItemBack });
      breadcrumbSegments.push({ label: selectedItem.slug });
    } else {
      breadcrumbSegments.push({ label: squadLabel });
    }
  }

  // Agent detail view (level 3)
  if (selectedSquad && selectedAgent) {
    return (
      <SquadAgentDetail
        squadName={selectedSquad}
        agentId={selectedAgent}
        breadcrumb={<SquadBreadcrumb segments={breadcrumbSegments} className="mb-6" />}
      />
    );
  }

  // Item viewer (level 3)
  if (selectedSquad && selectedItem) {
    return (
      <SquadDetail
        squadName={selectedSquad}
        onAgentClick={handleAgentClick}
        selectedItem={selectedItem}
        onItemClick={handleItemClick}
        onItemBack={handleItemBack}
        breadcrumb={<SquadBreadcrumb segments={breadcrumbSegments} className="mb-4" />}
      />
    );
  }

  // Squad detail view (level 2)
  if (selectedSquad) {
    return (
      <SquadDetail
        squadName={selectedSquad}
        onAgentClick={handleAgentClick}
        selectedItem={null}
        onItemClick={handleItemClick}
        onItemBack={handleItemBack}
        breadcrumb={<SquadBreadcrumb segments={breadcrumbSegments} className="mb-6" />}
      />
    );
  }

  // Organogram view (level 1)
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network
              className="h-4 w-4 text-gold"
            />
            <h1 className="text-sm font-light text-text-primary">
              Squads
            </h1>

            {/* Primary count */}
            <span className="text-detail text-text-muted ml-2">
              <span className="font-mono text-text-secondary">{squads.length}</span> squads
            </span>

            {/* Secondary counts - readable */}
            <span className="text-caption text-text-disabled ml-3 hidden sm:inline" aria-label="Asset totals">
              <span className="font-mono text-text-muted">{summary.total_agents}</span> agents
              <span className="mx-1 opacity-40">/</span>
              <span className="font-mono text-text-muted">{summary.total_tasks}</span> tasks
              <span className="mx-1 opacity-40">/</span>
              <span className="font-mono text-text-muted">{summary.total_workflows}</span> workflows
              <span className="mx-1 opacity-40">/</span>
              <span className="font-mono text-text-muted">{summary.total_checklists}</span> checklists
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-disabled" />
              <input
                ref={searchInputRef}
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setFilterQuery('');
                    searchInputRef.current?.blur();
                  }
                }}
                placeholder="Filter squads..."
                className={cn(
                  'pl-7 pr-2 py-1 w-40 text-label',
                  'bg-bg-secondary border border-border',
                  'text-text-primary placeholder:text-text-disabled',
                  'focus:outline-none focus:border-gold',
                  'transition-colors'
                )}
                aria-label="Filter squads"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className={cn(
                'p-1.5 transition-colors',
                'text-text-muted hover:text-text-primary',
                isLoading && 'animate-spin'
              )}
              aria-label="Refresh squads"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && squads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gold mx-auto mb-3" />
              <span className="text-label text-text-muted uppercase tracking-wider">
                Loading squads...
              </span>
            </div>
          </div>
        ) : squads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-text-muted">No squads found</p>
              <p className="text-label text-text-disabled mt-1">
                Check that squads/ directory exists in the project root
              </p>
            </div>
          </div>
        ) : filteredSquads.length === 0 && filterQuery.trim() ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-label text-text-muted">
              No squads match &apos;{filterQuery.trim()}&apos;
            </p>
          </div>
        ) : (
          <SquadOrganogram
            squads={filteredSquads}
            domainIndex={filteredDomainIndex}
            onSquadClick={handleSquadClick}
          />
        )}
      </div>
    </div>
  );
}
