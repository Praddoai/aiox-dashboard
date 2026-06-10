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
import { squadsApi } from '../api/squads';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

describe('squadsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getSquads ---

  describe('getSquads', () => {
    it('should call GET /squads without params', async () => {
      mockGet.mockResolvedValue({ squads: [], total: 0 });

      const result = await squadsApi.getSquads();

      expect(mockGet).toHaveBeenCalledWith('/squads', undefined);
      expect(result).toEqual([]);
    });

    it('should call GET /squads with params', async () => {
      const params = { domain: 'engineering' };
      const squads = [{ id: 'dev', name: 'Development' }];
      mockGet.mockResolvedValue({ squads, total: 1 });

      const result = await squadsApi.getSquads(params);

      expect(mockGet).toHaveBeenCalledWith('/squads', params);
      expect(result).toEqual(squads);
    });

    it('should return empty array when response has no squads field', async () => {
      mockGet.mockResolvedValue({});

      const result = await squadsApi.getSquads();

      expect(result).toEqual([]);
    });
  });

  // --- getSquad ---

  describe('getSquad', () => {
    it('should call GET /squads/:squadId', async () => {
      const squad = { id: 'development', name: 'Development', agents: [] };
      mockGet.mockResolvedValue({ squad });

      const result = await squadsApi.getSquad('development');

      expect(mockGet).toHaveBeenCalledWith('/squads/development');
      expect(result).toEqual(squad);
    });

    it('should return undefined when squad field is missing', async () => {
      mockGet.mockResolvedValue({});

      const result = await squadsApi.getSquad('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  // --- getSquadStats ---

  describe('getSquadStats', () => {
    it('should call GET /squads/:squadId/stats and return raw response', async () => {
      const stats = { totalAgents: 5, activeAgents: 3, totalExecutions: 100 };
      mockGet.mockResolvedValue(stats);

      const result = await squadsApi.getSquadStats('development');

      expect(mockGet).toHaveBeenCalledWith('/squads/development/stats');
      expect(result).toEqual(stats);
    });
  });

  // --- getEcosystemOverview ---

  describe('getEcosystemOverview', () => {
    it('should call GET /squads/ecosystem/overview and return raw response', async () => {
      const overview = { totalSquads: 10, totalAgents: 50, health: 'healthy' };
      mockGet.mockResolvedValue(overview);

      const result = await squadsApi.getEcosystemOverview();

      expect(mockGet).toHaveBeenCalledWith('/squads/ecosystem/overview');
      expect(result).toEqual(overview);
    });
  });

  // --- getSquadConnections ---

  describe('getSquadConnections', () => {
    it('should call GET /squads/:squadId/connections', async () => {
      const connections = [
        { from: 'agent-a', to: 'agent-b', type: 'dependency' },
      ];
      mockGet.mockResolvedValue({ connections });

      const result = await squadsApi.getSquadConnections('development');

      expect(mockGet).toHaveBeenCalledWith('/squads/development/connections');
      expect(result).toEqual(connections);
    });

    it('should return empty array when response has no connections field', async () => {
      mockGet.mockResolvedValue({});

      const result = await squadsApi.getSquadConnections('development');

      expect(result).toEqual([]);
    });
  });
});
