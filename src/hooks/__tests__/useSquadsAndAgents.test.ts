import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

// ── Mock API modules ──────────────────────────────────────────────────────────

vi.mock('../../services/api', () => ({
  squadsApi: {
    getSquads: vi.fn(),
    getSquad: vi.fn(),
    getSquadStats: vi.fn(),
    getEcosystemOverview: vi.fn(),
    getSquadConnections: vi.fn(),
  },
  agentsApi: {
    getAgents: vi.fn(),
    getAgentsBySquad: vi.fn(),
    getAgent: vi.fn(),
    getAgentCommands: vi.fn(),
    searchAgents: vi.fn(),
  },
}));

vi.mock('../../types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../types')>();
  return { ...actual };
});

import { squadsApi } from '../../services/api';
import { agentsApi } from '../../services/api';
import { useSquads, useSquad, useSquadStats, useEcosystemOverview, useSquadConnections } from '../useSquads';
import { useAgents, useAgent, useAgentById, useAgentCommands, useAgentSearch } from '../useAgents';
import { mockConnections } from '../../mocks/squads';
import type { Squad, SquadDetail, SquadStats, EcosystemOverview, AgentSummary, Agent, AgentCommand } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const mockSquad: Squad = {
  id: 'full-stack-dev',
  name: 'Full Stack Development',
  description: 'Full stack engineering squad',
  domain: 'engineering',
  agentCount: 5,
};

const mockSquadCopy: Squad = {
  id: 'copywriting',
  name: 'Copywriting Squad',
  description: 'Content and copy writing',
  domain: 'communication',
  agentCount: 3,
};

const mockSquadDesign: Squad = {
  id: 'creative-studio',
  name: 'Creative Studio',
  description: 'Design and creative squad',
  domain: 'visual',
  agentCount: 4,
};

const mockSquadOrchestrator: Squad = {
  id: 'orquestrador-global',
  name: 'Global Orchestrator',
  description: 'System orchestration',
  domain: 'orchestration',
  agentCount: 2,
};

const mockSquadDetail: SquadDetail = {
  ...mockSquad,
  agents: [
    { id: 'dex', name: 'Dex', tier: 2, squad: 'full-stack-dev', title: 'Developer' },
    { id: 'aria', name: 'Aria', tier: 1, squad: 'full-stack-dev', title: 'Architect' },
  ],
};

const mockSquadStats: SquadStats = {
  squadId: 'full-stack-dev',
  stats: {
    totalAgents: 5,
    byTier: { '0': 1, '1': 2, '2': 2 },
    quality: { withVoiceDna: 3, withAntiPatterns: 2, withIntegration: 4 },
    commands: { total: 20, byAgent: [{ agentId: 'dex', count: 10 }] },
    qualityScore: 85,
  },
};

const mockEcosystem: EcosystemOverview = {
  totalSquads: 10,
  totalAgents: 45,
  squads: [
    { id: 'full-stack-dev', name: 'Full Stack Dev', agentCount: 5, tiers: { orchestrators: 1, masters: 2, specialists: 2 } },
  ],
};

const mockAgentSummary: AgentSummary = {
  id: 'dex',
  name: 'Dex',
  title: 'Developer',
  tier: 2,
  squad: 'full-stack-dev',
  description: 'Full stack developer agent',
  commandCount: 10,
};

const mockAgentSummary2: AgentSummary = {
  id: 'aria',
  name: 'Aria',
  title: 'Architect',
  tier: 1,
  squad: 'full-stack-dev',
  description: 'System architect agent',
  commandCount: 5,
};

const mockFullAgent: Agent = {
  ...mockAgentSummary,
  persona: { role: 'Developer', style: 'practical' },
  commands: [{ command: '*build', action: 'Build the project', description: 'Runs build' }],
  quality: { hasVoiceDna: true, hasAntiPatterns: true, hasIntegration: true },
};

const mockAgentCommands: AgentCommand[] = [
  { command: '*build', action: 'Build project', description: 'Runs the full build pipeline' },
  { command: '*test', action: 'Run tests', description: 'Executes test suite' },
  { command: '*deploy', action: 'Deploy', description: 'Deploys to staging' },
];

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// useSquads Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useSquads', () => {
  it('fetches squads and enriches them with inferred type', async () => {
    vi.mocked(squadsApi.getSquads).mockResolvedValue([mockSquad, mockSquadCopy]);
    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    // full-stack-dev has "dev" in id => creator type from inferSquadType
    expect(result.current.data![0].type).toBeDefined();
    // copywriting has "copy" in id => copywriting type
    expect(result.current.data![1].type).toBe('copywriting');
  });

  it('preserves existing type if squad already has one', async () => {
    const squadWithType: Squad = { ...mockSquad, type: 'engineering' };
    vi.mocked(squadsApi.getSquads).mockResolvedValue([squadWithType]);
    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].type).toBe('engineering');
  });

  it('returns empty array when API returns no squads', async () => {
    vi.mocked(squadsApi.getSquads).mockResolvedValue([]);
    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('sets isError on API failure', async () => {
    vi.mocked(squadsApi.getSquads).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('infers design type from creative-studio id', async () => {
    vi.mocked(squadsApi.getSquads).mockResolvedValue([mockSquadDesign]);
    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].type).toBe('design');
  });

  it('infers orchestrator type from id containing "orquest"', async () => {
    vi.mocked(squadsApi.getSquads).mockResolvedValue([mockSquadOrchestrator]);
    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].type).toBe('orchestrator');
  });

  it('falls back to domain-based inference when id has no match', async () => {
    const squadNoIdMatch: Squad = {
      id: 'unknown-squad-xyz',
      name: 'Unknown',
      description: 'Unknown',
      domain: 'engineering',
      agentCount: 1,
    };
    vi.mocked(squadsApi.getSquads).mockResolvedValue([squadNoIdMatch]);
    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // domain "engineering" matches inferSquadType domain check => creator
    expect(result.current.data![0].type).toBeDefined();
  });

  it('returns default type when no id or domain match', async () => {
    const noMatchSquad: Squad = {
      id: 'zzzz-no-match',
      name: 'No Match',
      description: 'None',
      domain: 'unknown-domain',
      agentCount: 0,
    };
    vi.mocked(squadsApi.getSquads).mockResolvedValue([noMatchSquad]);
    const { result } = renderHook(() => useSquads(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].type).toBe('default');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useSquad Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useSquad', () => {
  it('fetches squad detail by id', async () => {
    vi.mocked(squadsApi.getSquad).mockResolvedValue(mockSquadDetail);
    const { result } = renderHook(() => useSquad('full-stack-dev'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('full-stack-dev');
    expect(result.current.data?.agents).toHaveLength(2);
  });

  it('does not fetch when squadId is null', () => {
    const { result } = renderHook(() => useSquad(null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(squadsApi.getSquad).not.toHaveBeenCalled();
  });

  it('uses queryKey ["squad", squadId]', async () => {
    vi.mocked(squadsApi.getSquad).mockResolvedValue(mockSquadDetail);
    const { result } = renderHook(() => useSquad('full-stack-dev'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(squadsApi.getSquad).toHaveBeenCalledWith('full-stack-dev');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useSquadStats Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useSquadStats', () => {
  it('fetches squad stats by id', async () => {
    vi.mocked(squadsApi.getSquadStats).mockResolvedValue(mockSquadStats);
    const { result } = renderHook(() => useSquadStats('full-stack-dev'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.squadId).toBe('full-stack-dev');
    expect(result.current.data?.stats.totalAgents).toBe(5);
    expect(result.current.data?.stats.qualityScore).toBe(85);
  });

  it('does not fetch when squadId is null', () => {
    const { result } = renderHook(() => useSquadStats(null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(squadsApi.getSquadStats).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useEcosystemOverview Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useEcosystemOverview', () => {
  it('fetches ecosystem overview', async () => {
    vi.mocked(squadsApi.getEcosystemOverview).mockResolvedValue(mockEcosystem);
    const { result } = renderHook(() => useEcosystemOverview(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalSquads).toBe(10);
    expect(result.current.data?.totalAgents).toBe(45);
    expect(result.current.data?.squads).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useSquadConnections Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useSquadConnections', () => {
  it('fetches connections from API when squadId is provided', async () => {
    const apiConnections = [{ from: 'a', to: 'b', type: 'handoffTo' as const }];
    vi.mocked(squadsApi.getSquadConnections).mockResolvedValue(apiConnections);
    const { result } = renderHook(() => useSquadConnections('full-stack-dev'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(apiConnections);
  });

  it('returns mockConnections when squadId is null', async () => {
    const { result } = renderHook(() => useSquadConnections(null), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockConnections);
  });

  it('falls back to mockConnections when API throws', async () => {
    vi.mocked(squadsApi.getSquadConnections).mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => useSquadConnections('unknown-squad'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockConnections);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useAgents Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useAgents', () => {
  it('fetches all agents when no squadId is provided', async () => {
    vi.mocked(agentsApi.getAgents).mockResolvedValue([mockAgentSummary, mockAgentSummary2]);
    const { result } = renderHook(() => useAgents(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(agentsApi.getAgents).toHaveBeenCalledWith({ limit: 500 });
  });

  it('fetches agents by squad when squadId is provided', async () => {
    vi.mocked(agentsApi.getAgentsBySquad).mockResolvedValue([mockAgentSummary]);
    const { result } = renderHook(() => useAgents('full-stack-dev'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(agentsApi.getAgentsBySquad).toHaveBeenCalledWith('full-stack-dev');
    expect(agentsApi.getAgents).not.toHaveBeenCalled();
  });

  it('uses queryKey ["agents", "all"] when squadId is undefined', async () => {
    vi.mocked(agentsApi.getAgents).mockResolvedValue([]);
    const { result } = renderHook(() => useAgents(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.getAgents).toHaveBeenCalled();
  });

  it('uses queryKey ["agents", squadId] when squadId is provided', async () => {
    vi.mocked(agentsApi.getAgentsBySquad).mockResolvedValue([]);
    const { result } = renderHook(() => useAgents('dev-squad'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.getAgentsBySquad).toHaveBeenCalledWith('dev-squad');
  });

  it('fetches all agents when squadId is null', async () => {
    vi.mocked(agentsApi.getAgents).mockResolvedValue([mockAgentSummary]);
    const { result } = renderHook(() => useAgents(null), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.getAgents).toHaveBeenCalledWith({ limit: 500 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useAgent Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useAgent', () => {
  it('fetches agent by squadId and agentId', async () => {
    vi.mocked(agentsApi.getAgent).mockResolvedValue(mockFullAgent);
    const { result } = renderHook(() => useAgent('full-stack-dev', 'dex'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('dex');
    expect(result.current.data?.name).toBe('Dex');
    expect(agentsApi.getAgent).toHaveBeenCalledWith('full-stack-dev', 'dex');
  });

  it('does not fetch when squadId is null', () => {
    const { result } = renderHook(() => useAgent(null, 'dex'), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(agentsApi.getAgent).not.toHaveBeenCalled();
  });

  it('does not fetch when agentId is null', () => {
    const { result } = renderHook(() => useAgent('full-stack-dev', null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(agentsApi.getAgent).not.toHaveBeenCalled();
  });

  it('does not fetch when both params are null', () => {
    const { result } = renderHook(() => useAgent(null, null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(agentsApi.getAgent).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useAgentById Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useAgentById', () => {
  it('uses direct lookup when squadId is available', async () => {
    vi.mocked(agentsApi.getAgent).mockResolvedValue(mockFullAgent);
    const { result } = renderHook(() => useAgentById('dex', 'full-stack-dev'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.getAgent).toHaveBeenCalledWith('full-stack-dev', 'dex');
    expect(result.current.data?.id).toBe('dex');
    expect(result.current.data?.squadType).toBeDefined();
    expect(result.current.data?.role).toBe('Developer');
    expect(result.current.data?.status).toBe('online');
  });

  it('falls back to search when direct lookup fails', async () => {
    vi.mocked(agentsApi.getAgent)
      .mockRejectedValueOnce(new Error('Not found'))   // direct lookup fails
      .mockResolvedValueOnce(mockFullAgent);            // second call after search finds it
    vi.mocked(agentsApi.searchAgents).mockResolvedValue([mockAgentSummary]);

    const { result } = renderHook(() => useAgentById('dex', 'wrong-squad'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.searchAgents).toHaveBeenCalledWith({ query: 'dex', limit: 10 });
    expect(result.current.data?.id).toBe('dex');
  });

  it('uses search when no squadId is provided', async () => {
    vi.mocked(agentsApi.searchAgents).mockResolvedValue([mockAgentSummary]);
    vi.mocked(agentsApi.getAgent).mockResolvedValue(mockFullAgent);

    const { result } = renderHook(() => useAgentById('dex'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.searchAgents).toHaveBeenCalledWith({ query: 'dex', limit: 10 });
    expect(result.current.data?.id).toBe('dex');
  });

  it('returns null when agentId is null', () => {
    const { result } = renderHook(() => useAgentById(null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(agentsApi.getAgent).not.toHaveBeenCalled();
    expect(agentsApi.searchAgents).not.toHaveBeenCalled();
  });

  it('returns null when agent is not found in search results', async () => {
    vi.mocked(agentsApi.searchAgents).mockResolvedValue([]);

    const { result } = renderHook(() => useAgentById('nonexistent-agent'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('enriches agent with role "Agent" when title is missing', async () => {
    const agentNoTitle: Agent = { ...mockFullAgent, title: undefined };
    vi.mocked(agentsApi.getAgent).mockResolvedValue(agentNoTitle);

    const { result } = renderHook(() => useAgentById('dex', 'full-stack-dev'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.role).toBe('Agent');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useAgentCommands Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useAgentCommands', () => {
  it('fetches commands for an agent', async () => {
    vi.mocked(agentsApi.getAgentCommands).mockResolvedValue(mockAgentCommands);
    const { result } = renderHook(() => useAgentCommands('full-stack-dev', 'dex'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data![0].command).toBe('*build');
    expect(agentsApi.getAgentCommands).toHaveBeenCalledWith('full-stack-dev', 'dex');
  });

  it('does not fetch when squadId is null', () => {
    const { result } = renderHook(() => useAgentCommands(null, 'dex'), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(agentsApi.getAgentCommands).not.toHaveBeenCalled();
  });

  it('does not fetch when agentId is null', () => {
    const { result } = renderHook(() => useAgentCommands('full-stack-dev', null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(agentsApi.getAgentCommands).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useAgentSearch Hook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('useAgentSearch', () => {
  it('searches agents with query filter', async () => {
    vi.mocked(agentsApi.searchAgents).mockResolvedValue([mockAgentSummary]);
    const { result } = renderHook(
      () => useAgentSearch({ query: 'developer', limit: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(agentsApi.searchAgents).toHaveBeenCalledWith({ query: 'developer', limit: 10 });
  });

  it('searches agents with squad filter', async () => {
    vi.mocked(agentsApi.searchAgents).mockResolvedValue([mockAgentSummary, mockAgentSummary2]);
    const { result } = renderHook(
      () => useAgentSearch({ squad: 'full-stack-dev' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('searches agents with tier filter', async () => {
    vi.mocked(agentsApi.searchAgents).mockResolvedValue([mockAgentSummary2]);
    const { result } = renderHook(
      () => useAgentSearch({ tier: 1 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('does not fetch when no filters are active', () => {
    const { result } = renderHook(
      () => useAgentSearch({}),
      { wrapper: createWrapper() },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(agentsApi.searchAgents).not.toHaveBeenCalled();
  });

  it('enables query when tier is 0 (falsy but valid)', async () => {
    vi.mocked(agentsApi.searchAgents).mockResolvedValue([]);
    const { result } = renderHook(
      () => useAgentSearch({ tier: 0 }),
      { wrapper: createWrapper() },
    );

    // tier: 0 is falsy but !== undefined, so enabled should be true
    // The hook checks: filters.tier !== undefined
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.searchAgents).toHaveBeenCalled();
  });
});
