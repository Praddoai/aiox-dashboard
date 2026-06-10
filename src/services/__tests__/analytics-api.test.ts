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
import { analyticsApi } from '../api/analytics';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

describe('analyticsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getOverview ---

  describe('getOverview', () => {
    it('should call GET /analytics/overview with default period "day"', async () => {
      const overview = { period: 'day', summary: {} };
      mockGet.mockResolvedValue(overview);

      const result = await analyticsApi.getOverview();

      expect(mockGet).toHaveBeenCalledWith('/analytics/overview', { period: 'day' });
      expect(result).toEqual(overview);
    });

    it('should call GET /analytics/overview with custom period', async () => {
      const overview = { period: 'week', summary: {} };
      mockGet.mockResolvedValue(overview);

      const result = await analyticsApi.getOverview('week');

      expect(mockGet).toHaveBeenCalledWith('/analytics/overview', { period: 'week' });
      expect(result).toEqual(overview);
    });
  });

  // --- getRealtime ---

  describe('getRealtime', () => {
    it('should call GET /analytics/realtime with no params', async () => {
      const realtime = { timestamp: '2026-03-09T00:00:00Z', requestsPerMinute: 42 };
      mockGet.mockResolvedValue(realtime);

      const result = await analyticsApi.getRealtime();

      expect(mockGet).toHaveBeenCalledWith('/analytics/realtime');
      expect(result).toEqual(realtime);
    });
  });

  // --- getAgentPerformance ---

  describe('getAgentPerformance', () => {
    it('should call GET /analytics/performance/agents without params', async () => {
      const data = { agents: [{ agentId: 'dex', totalExecutions: 50 }] };
      mockGet.mockResolvedValue(data);

      const result = await analyticsApi.getAgentPerformance();

      expect(mockGet).toHaveBeenCalledWith('/analytics/performance/agents', undefined);
      expect(result).toEqual(data);
    });

    it('should call GET /analytics/performance/agents with params', async () => {
      const params = { period: 'week' as const, squadId: 'dev', limit: 10 };
      const data = { agents: [] };
      mockGet.mockResolvedValue(data);

      const result = await analyticsApi.getAgentPerformance(params);

      expect(mockGet).toHaveBeenCalledWith('/analytics/performance/agents', params);
      expect(result).toEqual(data);
    });
  });

  // --- getSquadPerformance ---

  describe('getSquadPerformance', () => {
    it('should call GET /analytics/performance/squads without params', async () => {
      const data = { squads: [{ squadId: 'dev', totalExecutions: 200 }] };
      mockGet.mockResolvedValue(data);

      const result = await analyticsApi.getSquadPerformance();

      expect(mockGet).toHaveBeenCalledWith('/analytics/performance/squads', undefined);
      expect(result).toEqual(data);
    });

    it('should call GET /analytics/performance/squads with params', async () => {
      const params = { period: 'month' as const, limit: 5 };
      const data = { squads: [] };
      mockGet.mockResolvedValue(data);

      const result = await analyticsApi.getSquadPerformance(params);

      expect(mockGet).toHaveBeenCalledWith('/analytics/performance/squads', params);
      expect(result).toEqual(data);
    });
  });

  // --- getCostReport ---

  describe('getCostReport', () => {
    it('should call GET /analytics/costs with default period "month"', async () => {
      const report = { period: 'month', summary: { totalCost: 150 } };
      mockGet.mockResolvedValue(report);

      const result = await analyticsApi.getCostReport();

      expect(mockGet).toHaveBeenCalledWith('/analytics/costs', { period: 'month' });
      expect(result).toEqual(report);
    });

    it('should call GET /analytics/costs with custom period', async () => {
      const report = { period: 'quarter', summary: { totalCost: 500 } };
      mockGet.mockResolvedValue(report);

      const result = await analyticsApi.getCostReport('quarter');

      expect(mockGet).toHaveBeenCalledWith('/analytics/costs', { period: 'quarter' });
      expect(result).toEqual(report);
    });
  });

  // --- getHealthDashboard ---

  describe('getHealthDashboard', () => {
    it('should call GET /analytics/health-dashboard with no params', async () => {
      const dashboard = { timestamp: '2026-03-09', status: 'healthy', availability: 99.9 };
      mockGet.mockResolvedValue(dashboard);

      const result = await analyticsApi.getHealthDashboard();

      expect(mockGet).toHaveBeenCalledWith('/analytics/health-dashboard');
      expect(result).toEqual(dashboard);
    });
  });

  // --- getTokenUsage ---

  describe('getTokenUsage', () => {
    it('should call GET /analytics/usage/tokens without params', async () => {
      const usage = { total: { input: 1000, output: 2000 }, byGroup: [] };
      mockGet.mockResolvedValue(usage);

      const result = await analyticsApi.getTokenUsage();

      expect(mockGet).toHaveBeenCalledWith('/analytics/usage/tokens', undefined);
      expect(result).toEqual(usage);
    });

    it('should call GET /analytics/usage/tokens with params', async () => {
      const params = { period: 'week' as const, groupBy: 'squad' as const };
      const usage = {
        total: { input: 5000, output: 8000 },
        byGroup: [{ name: 'dev', input: 3000, output: 5000 }],
      };
      mockGet.mockResolvedValue(usage);

      const result = await analyticsApi.getTokenUsage(params);

      expect(mockGet).toHaveBeenCalledWith('/analytics/usage/tokens', params);
      expect(result).toEqual(usage);
    });
  });
});
