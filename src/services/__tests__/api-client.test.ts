import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock the types import so the module can load without pulling in all types
vi.mock('../../types', () => ({}));

// Import the singleton — we'll use its constructor to create fresh instances
import { apiClient } from '../api/client';

// Extract the ApiClient class from the singleton's constructor
const ApiClient = apiClient.constructor as new (baseUrl: string) => typeof apiClient;

// Helper to create a mock Response
function mockResponse(
  body: unknown,
  init?: { status?: number; statusText?: string; ok?: boolean }
) {
  const status = init?.status ?? 200;
  const ok = init?.ok ?? (status >= 200 && status < 300);
  const statusText = init?.statusText ?? (ok ? 'OK' : 'Error');
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

  return {
    ok,
    status,
    statusText,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue(typeof body === 'string' ? JSON.parse(body) : body),
    text: vi.fn().mockResolvedValue(bodyStr),
    clone: vi.fn(),
  } as unknown as Response;
}

describe('ApiClient', () => {
  let client: typeof apiClient;
  let mockFetch: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Ensure navigator.onLine is true by default
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

    client = new ApiClient('http://localhost:3000/api');
  });

  // ─── HTTP Methods ───────────────────────────────────────────────────

  describe('HTTP Methods', () => {
    it('GET sends correct method and URL', async () => {
      mockFetch.mockResolvedValue(mockResponse({ data: 'ok' }));

      const result = await client.get('/users');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/users');
      expect(options.method).toBe('GET');
      expect(result).toEqual({ data: 'ok' });
    });

    it('GET appends query params, skipping undefined values', async () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [] }));

      await client.get('/search', { q: 'test', page: 1, filter: undefined });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('?q=test&page=1');
      expect(url).not.toContain('filter');
    });

    it('POST sends JSON body with correct method', async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: 1 }));

      const payload = { name: 'test', value: 42 };
      const result = await client.post('/items', payload);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/items');
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(payload));
      expect(result).toEqual({ id: 1 });
    });

    it('POST without body omits Content-Type header', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));

      await client.post('/trigger');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toBeUndefined();
      const headers = options.headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('PUT sends correct method and body', async () => {
      mockFetch.mockResolvedValue(mockResponse({ updated: true }));

      await client.put('/items/1', { name: 'updated' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/items/1');
      expect(options.method).toBe('PUT');
      expect(options.body).toBe(JSON.stringify({ name: 'updated' }));
    });

    it('PATCH sends correct method and body', async () => {
      mockFetch.mockResolvedValue(mockResponse({ patched: true }));

      await client.patch('/items/1', { status: 'active' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/items/1');
      expect(options.method).toBe('PATCH');
      expect(options.body).toBe(JSON.stringify({ status: 'active' }));
    });

    it('DELETE sends correct method without body', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));

      await client.delete('/items/1');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/items/1');
      expect(options.method).toBe('DELETE');
      expect(options.body).toBeUndefined();
    });

    it('handles empty response body by returning empty object', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      } as unknown as Response);

      const result = await client.delete('/items/1');
      expect(result).toEqual({});
    });
  });

  // ─── Auth Management ────────────────────────────────────────────────

  describe('Auth Management', () => {
    it('setAuthToken adds Bearer authorization header', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      client.setAuthToken('my-jwt-token');
      await client.get('/protected');

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer my-jwt-token');
    });

    it('setApiKey adds X-API-Key header', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      client.setApiKey('api-key-123');
      await client.get('/external');

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('api-key-123');
    });

    it('clearAuth removes both Authorization and X-API-Key headers', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      client.setAuthToken('token');
      client.setApiKey('key');
      client.clearAuth();
      await client.get('/open');

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      expect(headers['X-API-Key']).toBeUndefined();
    });
  });

  // ─── Interceptors ──────────────────────────────────────────────────

  describe('Interceptors', () => {
    it('request interceptor modifies config before fetch', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      client.addRequestInterceptor((config) => {
        return {
          ...config,
          headers: { ...(config.headers as Record<string, string>), 'X-Custom': 'value' },
        };
      });

      await client.get('/test');

      const [, options] = mockFetch.mock.calls[0];
      const headers = options.headers as Record<string, string>;
      expect(headers['X-Custom']).toBe('value');
    });

    it('response interceptor receives response and config', async () => {
      const originalResponse = mockResponse({ original: true });
      mockFetch.mockResolvedValue(originalResponse);
      const interceptorFn = vi.fn((response: Response) => response);

      client.addResponseInterceptor(interceptorFn);
      await client.get('/test');

      expect(interceptorFn).toHaveBeenCalledTimes(1);
      expect(interceptorFn.mock.calls[0][0]).toBe(originalResponse);
    });

    it('error interceptor is called on HTTP errors', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Not Found', message: 'Resource not found' },
        { status: 404 },
      ));
      const errorInterceptor = vi.fn((error) => error);

      client.setRetryConfig({ maxRetries: 0 });
      client.addErrorInterceptor(errorInterceptor);

      await expect(client.get('/missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(errorInterceptor).toHaveBeenCalledTimes(1);
    });

    it('removing interceptor via returned unsubscribe function works', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));
      const interceptorFn = vi.fn((config) => config);

      const remove = client.addRequestInterceptor(interceptorFn);
      await client.get('/first');
      expect(interceptorFn).toHaveBeenCalledTimes(1);

      remove();
      await client.get('/second');
      expect(interceptorFn).toHaveBeenCalledTimes(1);
    });

    it('removing response interceptor via unsubscribe works', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));
      const interceptorFn = vi.fn((response: Response) => response);

      const remove = client.addResponseInterceptor(interceptorFn);
      await client.get('/first');
      expect(interceptorFn).toHaveBeenCalledTimes(1);

      remove();
      await client.get('/second');
      expect(interceptorFn).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Retry Logic ───────────────────────────────────────────────────

  describe('Retry Logic', () => {
    it('retries on 500 status up to maxRetries then throws', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Server Error', message: 'Internal Server Error' },
        { status: 500 },
      ));

      client.setRetryConfig({ maxRetries: 2, baseDelay: 1, maxDelay: 5 });

      await expect(client.get('/flaky')).rejects.toMatchObject({
        code: 'SERVER_ERROR',
        status: 500,
        retryable: true,
      });

      // 1 initial + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does NOT retry on 404 (non-retryable status)', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Not Found', message: 'Not found' },
        { status: 404 },
      ));

      client.setRetryConfig({ maxRetries: 3, baseDelay: 1 });

      await expect(client.get('/missing')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        retryable: false,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('succeeds after a retry when server recovers', async () => {
      const failResponse = mockResponse(
        { error: 'Server Error', message: 'Temporary' },
        { status: 503 },
      );
      const successResponse = mockResponse({ result: 'ok' });

      mockFetch
        .mockResolvedValueOnce(failResponse)
        .mockResolvedValueOnce(successResponse);

      client.setRetryConfig({ maxRetries: 3, baseDelay: 1, maxDelay: 5 });

      const result = await client.get('/recover');

      expect(result).toEqual({ result: 'ok' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 429 (rate limited)', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Rate Limited', message: 'Too many requests' },
        { status: 429 },
      ));

      client.setRetryConfig({ maxRetries: 1, baseDelay: 1, maxDelay: 5 });

      await expect(client.get('/rate-limited')).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        retryable: true,
      });

      // 1 initial + 1 retry = 2 calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Error Classification ─────────────────────────────────────────

  describe('Error Classification', () => {
    beforeEach(() => {
      client.setRetryConfig({ maxRetries: 0 });
    });

    it('classifies 401 as UNAUTHORIZED', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Unauthorized', message: 'Invalid token' },
        { status: 401 },
      ));

      await expect(client.get('/auth')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });
    });

    it('classifies 403 as FORBIDDEN', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 },
      ));

      await expect(client.get('/admin')).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('classifies 422 as VALIDATION_ERROR', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Validation Error', message: 'Invalid email format' },
        { status: 422 },
      ));

      await expect(client.post('/users', { email: 'bad' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 422,
      });
    });

    it('classifies 400 as VALIDATION_ERROR', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Bad Request', message: 'Missing fields' },
        { status: 400 },
      ));

      await expect(client.post('/users', {})).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });
  });

  // ─── Offline Behavior ─────────────────────────────────────────────

  describe('Offline Behavior', () => {
    it('throws NETWORK_ERROR when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
      const offlineClient = new ApiClient('http://localhost:3000/api');

      await expect(offlineClient.get('/anything')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        retryable: true,
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('getOnlineStatus returns current navigator state at construction time', () => {
      expect(client.getOnlineStatus()).toBe(true);

      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
      const offlineClient = new ApiClient('http://localhost:3000/api');
      expect(offlineClient.getOnlineStatus()).toBe(false);
    });
  });

  // ─── Timeout Behavior ─────────────────────────────────────────────

  describe('Timeout Behavior', () => {
    it('passes an AbortSignal to fetch', async () => {
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        expect(options.signal).toBeDefined();
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return Promise.resolve(mockResponse({ ok: true }));
      });

      client.setDefaultTimeout(5000);
      await client.get('/slow');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on AbortError (timeout) and eventually throws TIMEOUT', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      client.setRetryConfig({ maxRetries: 1, baseDelay: 1, maxDelay: 5 });

      await expect(client.get('/timeout')).rejects.toMatchObject({
        code: 'TIMEOUT',
        status: 408,
        retryable: true,
      });

      // 1 initial + 1 retry = 2 calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ─── getBaseUrl ────────────────────────────────────────────────────

  describe('getBaseUrl', () => {
    it('strips trailing /api from base URL', () => {
      const c = new ApiClient('http://localhost:3000/api');
      expect(c.getBaseUrl()).toBe('http://localhost:3000');
    });

    it('returns URL unchanged if no /api suffix', () => {
      const c = new ApiClient('http://localhost:3000');
      expect(c.getBaseUrl()).toBe('http://localhost:3000');
    });

    it('only strips /api at the end, not in the middle', () => {
      const c = new ApiClient('http://localhost:3000/api/v2');
      expect(c.getBaseUrl()).toBe('http://localhost:3000/api/v2');
    });
  });

  // ─── Configuration Methods ────────────────────────────────────────

  describe('Configuration', () => {
    it('setRetryConfig merges partial config', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: 'Error', message: 'fail' },
        { status: 500 },
      ));

      client.setRetryConfig({ maxRetries: 1, baseDelay: 1, maxDelay: 5 });

      await expect(client.get('/fail')).rejects.toBeDefined();

      // 1 initial + 1 retry = 2 calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('setDefaultTimeout updates the timeout used by requests', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      client.setDefaultTimeout(1000);
      await client.get('/fast');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Network Errors ───────────────────────────────────────────────

  describe('Network Errors', () => {
    it('retries on fetch network error and eventually throws NETWORK_ERROR', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValue(networkError);

      client.setRetryConfig({ maxRetries: 1, baseDelay: 1, maxDelay: 5 });

      await expect(client.get('/broken')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        retryable: true,
      });

      // 1 initial + 1 retry = 2 calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('wraps unknown errors with UNKNOWN code', async () => {
      const weirdError = new Error('something unexpected');
      mockFetch.mockRejectedValue(weirdError);

      client.setRetryConfig({ maxRetries: 0 });

      await expect(client.get('/weird')).rejects.toMatchObject({
        code: 'UNKNOWN',
        retryable: false,
      });
    });
  });
});
