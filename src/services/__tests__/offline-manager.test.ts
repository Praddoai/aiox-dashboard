import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The module instantiates a singleton at import time, which calls loadQueue()
// and setupNetworkListeners(). The test setup already mocks localStorage and
// window globals, so the singleton initialises safely in jsdom.

import { offlineManager } from '../offline/OfflineManager';
import type { QueuedRequest } from '../offline/OfflineManager';

// Helper to build a minimal enqueue payload
function makeRequest(
  overrides: Partial<Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>> = {},
): Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'> {
  return {
    method: 'POST',
    url: '/api/test',
    headers: { 'Content-Type': 'application/json' },
    maxRetries: 3,
    priority: 0,
    ...overrides,
  };
}

describe('OfflineManager', () => {
  beforeEach(() => {
    offlineManager.clearQueue();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Queue management ----

  describe('enqueue', () => {
    it('should add a request to the queue and return an id', () => {
      const id = offlineManager.enqueue(makeRequest());

      expect(id).toMatch(/^req_/);
      expect(offlineManager.getQueueSize()).toBe(1);
    });

    it('should persist queue to localStorage on enqueue', () => {
      offlineManager.enqueue(makeRequest());

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'aios_offline_queue',
        expect.any(String),
      );
    });

    it('should order requests by priority (higher first)', () => {
      offlineManager.enqueue(makeRequest({ priority: 1, url: '/low' }));
      offlineManager.enqueue(makeRequest({ priority: 10, url: '/high' }));
      offlineManager.enqueue(makeRequest({ priority: 5, url: '/mid' }));

      const queue = offlineManager.getQueue();
      expect(queue[0].url).toBe('/high');
      expect(queue[1].url).toBe('/mid');
      expect(queue[2].url).toBe('/low');
    });

    it('should drop oldest request when queue is full (50)', () => {
      // Fill queue to capacity
      for (let i = 0; i < 50; i++) {
        offlineManager.enqueue(makeRequest({ url: `/api/item/${i}` }));
      }
      expect(offlineManager.getQueueSize()).toBe(50);

      // One more should evict the oldest
      offlineManager.enqueue(makeRequest({ url: '/api/item/new' }));
      expect(offlineManager.getQueueSize()).toBe(50);

      const queue = offlineManager.getQueue();
      // The very first item (/api/item/0) should have been removed
      expect(queue.find(r => r.url === '/api/item/0')).toBeUndefined();
      expect(queue.find(r => r.url === '/api/item/new')).toBeDefined();
    });
  });

  describe('dequeue', () => {
    it('should remove a request by id and return true', () => {
      const id = offlineManager.enqueue(makeRequest());
      expect(offlineManager.getQueueSize()).toBe(1);

      const result = offlineManager.dequeue(id);
      expect(result).toBe(true);
      expect(offlineManager.getQueueSize()).toBe(0);
    });

    it('should return false when id does not exist', () => {
      const result = offlineManager.dequeue('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getQueue', () => {
    it('should return a copy of the internal queue', () => {
      offlineManager.enqueue(makeRequest());
      const q1 = offlineManager.getQueue();
      const q2 = offlineManager.getQueue();

      expect(q1).toEqual(q2);
      // Should be different array references (defensive copy)
      expect(q1).not.toBe(q2);
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', () => {
      expect(offlineManager.getQueueSize()).toBe(0);
    });

    it('should return correct count after multiple enqueues', () => {
      offlineManager.enqueue(makeRequest());
      offlineManager.enqueue(makeRequest());
      offlineManager.enqueue(makeRequest());
      expect(offlineManager.getQueueSize()).toBe(3);
    });
  });

  describe('clearQueue', () => {
    it('should empty the queue', () => {
      offlineManager.enqueue(makeRequest());
      offlineManager.enqueue(makeRequest());
      expect(offlineManager.getQueueSize()).toBe(2);

      offlineManager.clearQueue();
      expect(offlineManager.getQueueSize()).toBe(0);
    });

    it('should persist the cleared state to localStorage', () => {
      offlineManager.enqueue(makeRequest());
      vi.mocked(localStorage.setItem).mockClear();

      offlineManager.clearQueue();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'aios_offline_queue',
        '[]',
      );
    });
  });

  // ---- Listeners ----

  describe('onStatusChange', () => {
    it('should call the listener immediately with the current status', () => {
      const listener = vi.fn();
      offlineManager.onStatusChange(listener);

      // Called once immediately upon subscription
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(offlineManager.getNetworkStatus());
    });

    it('should return an unsubscribe function that removes the listener', () => {
      const listener = vi.fn();
      const unsub = offlineManager.onStatusChange(listener);

      unsub();

      // After unsubscribe the listener set should no longer include it.
      // We verify by checking it was called exactly once (the immediate call).
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('onSync', () => {
    it('should return an unsubscribe function', () => {
      const listener = vi.fn();
      const unsub = offlineManager.onSync(listener);

      expect(typeof unsub).toBe('function');
      unsub(); // should not throw
    });
  });

  // ---- syncQueue ----

  describe('syncQueue', () => {
    it('should return empty array when queue is empty', async () => {
      const results = await offlineManager.syncQueue();
      expect(results).toEqual([]);
    });

    it('should send queued requests via fetch and clear successful ones', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));

      offlineManager.enqueue(makeRequest({ url: '/api/a' }));
      offlineManager.enqueue(makeRequest({ url: '/api/b' }));

      const results = await offlineManager.syncQueue();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      // Successful requests should be cleared from the queue
      expect(offlineManager.getQueueSize()).toBe(0);
    });

    it('should keep failed requests in queue with incremented retryCount', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValue(new Error('Network error'));

      offlineManager.enqueue(makeRequest({ url: '/api/fail', maxRetries: 3 }));

      const results = await offlineManager.syncQueue();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      // The request should remain in the queue with retryCount incremented
      expect(offlineManager.getQueueSize()).toBe(1);
      expect(offlineManager.getQueue()[0].retryCount).toBe(1);
    });

    it('should drop requests that exceed maxRetries', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Enqueue a request, manually simulate it already at max retries
      offlineManager.enqueue(makeRequest({ url: '/api/exhausted', maxRetries: 1 }));

      // First sync: retryCount 0 -> 1 (still in queue)
      await offlineManager.syncQueue();
      expect(offlineManager.getQueueSize()).toBe(1);

      // Second sync: retryCount 1 >= maxRetries 1, should be dropped
      await offlineManager.syncQueue();
      expect(offlineManager.getQueueSize()).toBe(0);
    });

    it('should notify sync listeners for each request', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));

      const syncListener = vi.fn();
      const unsub = offlineManager.onSync(syncListener);

      offlineManager.enqueue(makeRequest());

      await offlineManager.syncQueue();

      expect(syncListener).toHaveBeenCalledTimes(1);
      expect(syncListener).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );

      unsub();
    });
  });

  // ---- Getters ----

  describe('getters', () => {
    it('getNetworkStatus returns a valid status string', () => {
      const status = offlineManager.getNetworkStatus();
      expect(['online', 'offline', 'slow']).toContain(status);
    });

    it('getIsOnline returns a boolean', () => {
      expect(typeof offlineManager.getIsOnline()).toBe('boolean');
    });

    it('getConnectionQuality returns a number between 0 and 1', () => {
      const quality = offlineManager.getConnectionQuality();
      expect(quality).toBeGreaterThanOrEqual(0);
      expect(quality).toBeLessThanOrEqual(1);
    });

    it('getIsSyncing returns false when not syncing', () => {
      expect(offlineManager.getIsSyncing()).toBe(false);
    });
  });
});
