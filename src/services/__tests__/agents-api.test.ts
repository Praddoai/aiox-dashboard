import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../api/client';
import { agentsApi } from '../api/agents';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

describe('agentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getAgents ---

  describe('getAgents', () => {
    it('should call GET /agents without params', async () => {
      mockGet.mockResolvedValue({ agents: [], total: 0 });

      const result = await agentsApi.getAgents();

      expect(mockGet).toHaveBeenCalledWith('/agents', undefined);
      expect(result).toEqual([]);
    });

    it('should call GET /agents with params', async () => {
      const params = { squad: 'dev', tier: 1, limit: 10 };
      const agents = [{ id: 'agent-1', name: 'Dex' }];
      mockGet.mockResolvedValue({ agents, total: 1 });

      const result = await agentsApi.getAgents(params);

      expect(mockGet).toHaveBeenCalledWith('/agents', params);
      expect(result).toEqual(agents);
    });

    it('should return empty array when response has no agents field', async () => {
      mockGet.mockResolvedValue({});

      const result = await agentsApi.getAgents();

      expect(result).toEqual([]);
    });
  });

  // --- searchAgents ---

  describe('searchAgents', () => {
    it('should call GET /agents/search with query and limit', async () => {
      const filters = { query: 'dev', limit: 5 };
      const results = [{ id: 'agent-1', name: 'Dex' }];
      mockGet.mockResolvedValue({ results, query: 'dev', total: 1 });

      const result = await agentsApi.searchAgents(filters);

      expect(mockGet).toHaveBeenCalledWith('/agents/search', { q: 'dev', limit: 5 });
      expect(result).toEqual(results);
    });

    it('should return empty array when response has no results field', async () => {
      mockGet.mockResolvedValue({});

      const result = await agentsApi.searchAgents({ query: 'nonexistent' });

      expect(result).toEqual([]);
    });

    it('should pass undefined limit when not provided', async () => {
      mockGet.mockResolvedValue({ results: [], query: 'test', total: 0 });

      await agentsApi.searchAgents({ query: 'test' });

      expect(mockGet).toHaveBeenCalledWith('/agents/search', { q: 'test', limit: undefined });
    });
  });

  // --- getAgentsBySquad ---

  describe('getAgentsBySquad', () => {
    it('should call GET /agents/squad/:squadId', async () => {
      const agents = [{ id: 'agent-1', name: 'Dex' }];
      mockGet.mockResolvedValue({ squad: 'development', agents, total: 1 });

      const result = await agentsApi.getAgentsBySquad('development');

      expect(mockGet).toHaveBeenCalledWith('/agents/squad/development');
      expect(result).toEqual(agents);
    });

    it('should return empty array when response has no agents field', async () => {
      mockGet.mockResolvedValue({ squad: 'development' });

      const result = await agentsApi.getAgentsBySquad('development');

      expect(result).toEqual([]);
    });
  });

  // --- getAgent ---

  describe('getAgent', () => {
    it('should call GET /agents/:squadId/:agentId', async () => {
      const agent = { id: 'dex', name: 'Dex', squad: 'development' };
      mockGet.mockResolvedValue({ agent });

      const result = await agentsApi.getAgent('development', 'dex');

      expect(mockGet).toHaveBeenCalledWith('/agents/development/dex');
      expect(result).toEqual(agent);
    });

    it('should return undefined when agent field is missing', async () => {
      mockGet.mockResolvedValue({});

      const result = await agentsApi.getAgent('development', 'nonexistent');

      expect(result).toBeUndefined();
    });
  });

  // --- getAgentCommands ---

  describe('getAgentCommands', () => {
    it('should call GET /agents/:squadId/:agentId/commands', async () => {
      const commands = [{ name: '*help', description: 'Show help' }];
      mockGet.mockResolvedValue({ agentId: 'dex', commands });

      const result = await agentsApi.getAgentCommands('development', 'dex');

      expect(mockGet).toHaveBeenCalledWith('/agents/development/dex/commands');
      expect(result).toEqual(commands);
    });

    it('should return empty array when response has no commands field', async () => {
      mockGet.mockResolvedValue({ agentId: 'dex' });

      const result = await agentsApi.getAgentCommands('development', 'dex');

      expect(result).toEqual([]);
    });
  });
});
