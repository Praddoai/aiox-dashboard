import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import { useSquads } from './useSquads';
import { useState, useMemo, useCallback } from 'react';

// ── Types ──

export interface KnowledgeFileItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  extension: string | null;
}

export interface KnowledgeOverview {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  byExtension: Record<string, number>;
  recentFiles: Array<{
    name: string;
    path: string;
    size: number;
    modified: string;
    extension: string;
  }>;
}

export interface KnowledgeFileContent {
  path: string;
  name: string;
  content: string;
  size: number;
  modified: string;
  extension: string;
}

export interface AgentKnowledge {
  agentId: string;
  agentName: string;
  squadId: string;
  knowledgePath?: string;
  files?: number;
  lastUpdated?: string;
}

// ── Mock Data ──

const MOCK_OVERVIEW: KnowledgeOverview = {
  totalFiles: 47,
  totalDirectories: 12,
  totalSize: 524288,
  byExtension: {
    md: 18,
    yaml: 8,
    json: 7,
    ts: 6,
    txt: 4,
    tsx: 3,
    js: 1,
  },
  recentFiles: [
    { name: 'architecture-overview.md', path: 'docs/architecture-overview.md', size: 12400, modified: new Date(Date.now() - 3600000).toISOString(), extension: 'md' },
    { name: 'api-spec.yaml', path: 'specs/api-spec.yaml', size: 8200, modified: new Date(Date.now() - 7200000).toISOString(), extension: 'yaml' },
    { name: 'agent-config.json', path: 'config/agent-config.json', size: 3100, modified: new Date(Date.now() - 10800000).toISOString(), extension: 'json' },
    { name: 'onboarding-guide.md', path: 'docs/guides/onboarding-guide.md', size: 6800, modified: new Date(Date.now() - 14400000).toISOString(), extension: 'md' },
    { name: 'database-schema.md', path: 'docs/database-schema.md', size: 9500, modified: new Date(Date.now() - 18000000).toISOString(), extension: 'md' },
    { name: 'workflow-rules.yaml', path: 'rules/workflow-rules.yaml', size: 4300, modified: new Date(Date.now() - 21600000).toISOString(), extension: 'yaml' },
    { name: 'squad-manifest.json', path: 'config/squad-manifest.json', size: 2800, modified: new Date(Date.now() - 25200000).toISOString(), extension: 'json' },
    { name: 'deployment-notes.txt', path: 'docs/deployment-notes.txt', size: 1900, modified: new Date(Date.now() - 28800000).toISOString(), extension: 'txt' },
    { name: 'helpers.ts', path: 'src/utils/helpers.ts', size: 5600, modified: new Date(Date.now() - 32400000).toISOString(), extension: 'ts' },
    { name: 'changelog.md', path: 'docs/changelog.md', size: 15200, modified: new Date(Date.now() - 36000000).toISOString(), extension: 'md' },
    { name: 'routing.ts', path: 'src/core/routing.ts', size: 7100, modified: new Date(Date.now() - 43200000).toISOString(), extension: 'ts' },
    { name: 'README.md', path: 'README.md', size: 4800, modified: new Date(Date.now() - 86400000).toISOString(), extension: 'md' },
  ],
};

const MOCK_DIRECTORY_ITEMS: KnowledgeFileItem[] = [
  { name: 'docs', type: 'directory', size: 0, modified: new Date(Date.now() - 3600000).toISOString(), extension: null },
  { name: 'config', type: 'directory', size: 0, modified: new Date(Date.now() - 7200000).toISOString(), extension: null },
  { name: 'specs', type: 'directory', size: 0, modified: new Date(Date.now() - 10800000).toISOString(), extension: null },
  { name: 'rules', type: 'directory', size: 0, modified: new Date(Date.now() - 14400000).toISOString(), extension: null },
  { name: 'src', type: 'directory', size: 0, modified: new Date(Date.now() - 18000000).toISOString(), extension: null },
  { name: 'README.md', type: 'file', size: 4800, modified: new Date(Date.now() - 86400000).toISOString(), extension: 'md' },
  { name: 'squad-manifest.json', type: 'file', size: 2800, modified: new Date(Date.now() - 25200000).toISOString(), extension: 'json' },
];

const MOCK_AGENTS: AgentKnowledge[] = [
  { agentId: 'dev-1', agentName: 'Dex', squadId: 'core-dev', knowledgePath: 'agents/core-dev/knowledge', files: 14, lastUpdated: new Date(Date.now() - 3600000).toISOString() },
  { agentId: 'qa-1', agentName: 'Quinn', squadId: 'core-dev', knowledgePath: 'agents/core-dev/qa-knowledge', files: 8, lastUpdated: new Date(Date.now() - 7200000).toISOString() },
  { agentId: 'arch-1', agentName: 'Atlas', squadId: 'core-dev', knowledgePath: 'agents/core-dev/arch-knowledge', files: 11, lastUpdated: new Date(Date.now() - 14400000).toISOString() },
  { agentId: 'pm-1', agentName: 'Morgan', squadId: 'product', knowledgePath: 'agents/product/pm-knowledge', files: 6, lastUpdated: new Date(Date.now() - 10800000).toISOString() },
  { agentId: 'po-1', agentName: 'Pax', squadId: 'product', knowledgePath: 'agents/product/po-knowledge', files: 9, lastUpdated: new Date(Date.now() - 21600000).toISOString() },
  { agentId: 'sm-1', agentName: 'River', squadId: 'product', knowledgePath: 'agents/product/sm-knowledge', files: 5, lastUpdated: new Date(Date.now() - 28800000).toISOString() },
  { agentId: 'devops-1', agentName: 'Gage', squadId: 'infra', knowledgePath: 'agents/infra/devops-knowledge', files: 12, lastUpdated: new Date(Date.now() - 18000000).toISOString() },
  { agentId: 'analyst-1', agentName: 'Aria', squadId: 'infra', knowledgePath: 'agents/infra/analyst-knowledge', files: 7, lastUpdated: new Date(Date.now() - 43200000).toISOString() },
];

const MOCK_FILE_CONTENT: KnowledgeFileContent = {
  path: 'mock',
  name: 'architecture-overview.md',
  content: `# Architecture Overview\n\nThis document describes the system architecture for the AIOS Platform.\n\n## Components\n\n### 1. Agent Orchestrator\nThe orchestrator manages agent lifecycle, task distribution, and inter-agent communication.\n\n### 2. Knowledge Base\nCentralized storage for agent knowledge, documents, and shared context.\n\n### 3. Squad System\nAgents are organized into squads with specialized roles.\n\n## Data Flow\n\n\`\`\`\nUser Request → Orchestrator → Squad Selection → Agent Execution → Response\n\`\`\`\n\n## Tech Stack\n- **Frontend**: React + TypeScript + Vite\n- **State**: Zustand\n- **Styling**: Tailwind CSS + Liquid Glass\n- **API**: REST + WebSocket\n`,
  size: 12400,
  modified: new Date(Date.now() - 3600000).toISOString(),
  extension: 'md',
};

function isOverviewEmpty(data: KnowledgeOverview): boolean {
  return data.totalFiles === 0 && data.totalDirectories === 0 && data.recentFiles.length === 0;
}

// ── Hooks ──

export function useKnowledgeOverview() {
  const query = useQuery<KnowledgeOverview>({
    queryKey: ['knowledge-overview'],
    queryFn: async () => {
      try {
        return await apiClient.get<KnowledgeOverview>('/knowledge/files/overview');
      } catch {
        return {
          totalFiles: 0,
          totalDirectories: 0,
          totalSize: 0,
          byExtension: {},
          recentFiles: [],
        };
      }
    },
    staleTime: 60000,
  });

  const isMock = useMemo(() => {
    if (!query.data) return false;
    return isOverviewEmpty(query.data);
  }, [query.data]);

  return { ...query, data: isMock ? MOCK_OVERVIEW : query.data, isMock };
}

export function useKnowledgeDirectory(path: string) {
  const query = useQuery<KnowledgeFileItem[]>({
    queryKey: ['knowledge-files', path],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ path: string; items: KnowledgeFileItem[] }>(
          '/knowledge/files',
          { path }
        );
        return response.items || [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  const isMock = useMemo(() => {
    if (!query.data) return false;
    return query.data.length === 0 && !path;
  }, [query.data, path]);

  return { ...query, data: isMock ? MOCK_DIRECTORY_ITEMS : query.data, isMock };
}

export function useKnowledgeFileContent(filePath: string | null) {
  const query = useQuery<KnowledgeFileContent | null>({
    queryKey: ['knowledge-file-content', filePath],
    queryFn: async () => {
      if (!filePath) return null;
      try {
        return await apiClient.get<KnowledgeFileContent>('/knowledge/files/content', { path: filePath });
      } catch {
        return null;
      }
    },
    enabled: !!filePath,
  });

  const isMock = useMemo(() => {
    if (!filePath) return false;
    return query.data === null && !query.isLoading;
  }, [query.data, query.isLoading, filePath]);

  const mockContent: KnowledgeFileContent | null = filePath ? {
    ...MOCK_FILE_CONTENT,
    path: filePath,
    name: filePath.split('/').pop() || filePath,
    extension: filePath.split('.').pop() || 'txt',
  } : null;

  return { ...query, data: isMock ? mockContent : query.data, isMock };
}

export function useAgentKnowledge(enabled = true) {
  const { data: rawSquads } = useSquads();
  const squads = rawSquads as unknown as Array<{ id: string; name: string; agentCount: number }> | undefined;

  const query = useQuery<AgentKnowledge[]>({
    queryKey: ['agent-knowledge'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ agents: AgentKnowledge[] }>('/knowledge/agents');
        return response.agents || [];
      } catch {
        return [];
      }
    },
    enabled,
    staleTime: 60000,
  });

  const isMock = useMemo(() => {
    if (!query.data) return false;
    return query.data.length === 0;
  }, [query.data]);

  const data = isMock ? MOCK_AGENTS : query.data;

  const agentsBySquad = useMemo(() => {
    return data?.reduce((acc, agent) => {
      if (!acc[agent.squadId]) {
        acc[agent.squadId] = [];
      }
      acc[agent.squadId].push(agent);
      return acc;
    }, {} as Record<string, AgentKnowledge[]>) || {};
  }, [data]);

  return { ...query, data, agentsBySquad, squads, isMock };
}

export function useKnowledgeSearch(overview: KnowledgeOverview | undefined) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  const recentFilesFiltered = useMemo(() => {
    if (!overview?.recentFiles) return [];
    let result = overview.recentFiles;

    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter((f) =>
        f.name.toLowerCase().includes(lowerQuery) || f.path.toLowerCase().includes(lowerQuery)
      );
    }

    if (filterType) {
      result = result.filter((f) => f.extension === filterType);
    }

    return result;
  }, [overview, query, filterType]);

  const clearFilters = useCallback(() => {
    setQuery('');
    setFilterType(null);
  }, []);

  return {
    query,
    setQuery,
    filterType,
    setFilterType,
    recentFilesFiltered,
    clearFilters,
    hasFilters: !!query || !!filterType,
  };
}

// ── Utilities ──

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FILE_TYPE_COLORS: Record<string, string> = {
  md: 'text-blue-400',
  yaml: 'text-yellow-400',
  yml: 'text-yellow-400',
  json: 'text-green-400',
  txt: 'text-gray-400',
  ts: 'text-blue-500',
  tsx: 'text-blue-500',
  js: 'text-yellow-500',
  jsx: 'text-yellow-500',
};
