import { describe, it, expect, vi } from 'vitest';

// Mock connection module before importing engine
vi.mock('../../lib/connection', () => ({
  getEngineUrl: () => 'http://test-engine:4002',
}));

import { engineApi } from '../api/engine';

// ---------- helpers ----------

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(body ? JSON.stringify(body) : ''),
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
}

// ---------- suite ----------

describe('engineApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ---------- health ----------

  describe('health()', () => {
    it('should call GET /health and return parsed JSON', async () => {
      const payload = { status: 'ok', version: '1.0.0', uptime_ms: 12345, pid: 1, ws_clients: 0 };
      globalThis.fetch = mockFetchResponse(payload);

      const result = await engineApi.health();

      expect(globalThis.fetch).toHaveBeenCalledOnce();
      const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://test-engine:4002/health');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(result).toEqual(payload);
    });
  });

  // ---------- pool ----------

  describe('pool()', () => {
    it('should call GET /pool and return pool status', async () => {
      const payload = { total: 4, occupied: 1, idle: 3, queue_depth: 0, slots: [] };
      globalThis.fetch = mockFetchResponse(payload);

      const result = await engineApi.pool();

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://test-engine:4002/pool');
      expect(result).toEqual(payload);
    });
  });

  // ---------- resizePool ----------

  describe('resizePool()', () => {
    it('should POST /pool/resize with size in body', async () => {
      const payload = { total: 8, occupied: 0, idle: 8, queue_depth: 0, slots: [] };
      globalThis.fetch = mockFetchResponse(payload);

      await engineApi.resizePool(8);

      const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://test-engine:4002/pool/resize');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ size: 8 });
    });
  });

  // ---------- listJobs ----------

  describe('listJobs()', () => {
    it('should call GET /jobs without query string when no params', async () => {
      const payload = { jobs: [] };
      globalThis.fetch = mockFetchResponse(payload);

      await engineApi.listJobs();

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://test-engine:4002/jobs');
    });

    it('should append status query param', async () => {
      globalThis.fetch = mockFetchResponse({ jobs: [] });

      await engineApi.listJobs({ status: 'running' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('status=running');
    });

    it('should append limit query param', async () => {
      globalThis.fetch = mockFetchResponse({ jobs: [] });

      await engineApi.listJobs({ limit: 10 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('limit=10');
    });

    it('should append both status and limit query params', async () => {
      globalThis.fetch = mockFetchResponse({ jobs: [] });

      await engineApi.listJobs({ status: 'completed', limit: 5 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('status=completed');
      expect(url).toContain('limit=5');
    });
  });

  // ---------- getJob ----------

  describe('getJob()', () => {
    it('should call GET /jobs/:id', async () => {
      const payload = { job: { id: 'job-1', status: 'completed' } };
      globalThis.fetch = mockFetchResponse(payload);

      const result = await engineApi.getJob('job-1');

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://test-engine:4002/jobs/job-1');
      expect(result).toEqual(payload);
    });
  });

  // ---------- getJobLogs ----------

  describe('getJobLogs()', () => {
    it('should call GET /jobs/:id/logs with default tail=100', async () => {
      const payload = { logs: ['line1', 'line2'], hasMore: false };
      globalThis.fetch = mockFetchResponse(payload);

      await engineApi.getJobLogs('job-1');

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://test-engine:4002/jobs/job-1/logs?tail=100');
    });

    it('should use custom tail value', async () => {
      globalThis.fetch = mockFetchResponse({ logs: [], hasMore: false });

      await engineApi.getJobLogs('job-1', 50);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://test-engine:4002/jobs/job-1/logs?tail=50');
    });
  });

  // ---------- cancelJob ----------

  describe('cancelJob()', () => {
    it('should call DELETE /jobs/:id', async () => {
      const payload = { status: 'cancelled' };
      globalThis.fetch = mockFetchResponse(payload);

      const result = await engineApi.cancelJob('job-1');

      const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('http://test-engine:4002/jobs/job-1');
      expect(opts.method).toBe('DELETE');
      expect(result).toEqual(payload);
    });
  });

  // ---------- error handling ----------

  describe('error handling', () => {
    it('should throw with isNetworkError when fetch rejects (engine unreachable)', async () => {
      globalThis.fetch = mockFetchNetworkError();

      await expect(engineApi.health()).rejects.toMatchObject({
        message: 'Engine unreachable',
        status: 0,
        isNetworkError: true,
      });
    });

    it('should throw with status and body.error when response is not ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Job not found' }),
      } as unknown as Response);

      await expect(engineApi.getJob('missing')).rejects.toMatchObject({
        message: 'Job not found',
        status: 404,
      });
    });

    it('should use generic message when error body cannot be parsed', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('invalid json')),
      } as unknown as Response);

      await expect(engineApi.health()).rejects.toMatchObject({
        message: 'Engine 500',
        status: 500,
      });
    });

    it('should return empty object for empty response body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: () => Promise.resolve(''),
      } as unknown as Response);

      const result = await engineApi.cancelJob('job-1');
      expect(result).toEqual({});
    });
  });
});
