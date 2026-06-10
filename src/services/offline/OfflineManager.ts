import { useState, useEffect, useCallback } from 'react';

// Types for queued requests
export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  body?: string;
  headers: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: number;
}

export type NetworkStatus = 'online' | 'offline' | 'slow';

interface SyncResult {
  success: boolean;
  request: QueuedRequest;
  response?: Response;
  error?: Error;
}

// Storage key for persisted queue
const QUEUE_STORAGE_KEY = 'aios_offline_queue';
const MAX_QUEUE_SIZE = 50;
const MAX_RETRIES = 3;

class OfflineManager {
  private queue: QueuedRequest[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing = false;
  private networkStatus: NetworkStatus = 'online';
  private listeners = new Set<(status: NetworkStatus) => void>();
  private syncListeners = new Set<(result: SyncResult) => void>();
  private connectionQuality: number = 1; // 0-1, where 1 is best

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
    this.checkConnectionQuality();
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateNetworkStatus('online');
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateNetworkStatus('offline');
    });

    // Check connection quality periodically
    setInterval(() => this.checkConnectionQuality(), 30000);
  }

  private async checkConnectionQuality(): Promise<void> {
    if (!this.isOnline) {
      this.connectionQuality = 0;
      return;
    }

    // Use Navigation Timing API if available
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        switch (effectiveType) {
          case '4g':
            this.connectionQuality = 1;
            break;
          case '3g':
            this.connectionQuality = 0.7;
            break;
          case '2g':
            this.connectionQuality = 0.3;
            break;
          default:
            this.connectionQuality = 0.1;
        }

        if (this.connectionQuality < 0.5 && this.isOnline) {
          this.updateNetworkStatus('slow');
        }
        return;
      }
    }

    // Fallback: measure actual request time
    try {
      const start = performance.now();
      await fetch('/api/health', { method: 'HEAD' });
      const duration = performance.now() - start;

      if (duration < 200) {
        this.connectionQuality = 1;
        this.updateNetworkStatus('online');
      } else if (duration < 1000) {
        this.connectionQuality = 0.7;
        this.updateNetworkStatus('online');
      } else {
        this.connectionQuality = 0.3;
        this.updateNetworkStatus('slow');
      }
    } catch {
      this.connectionQuality = 0;
      this.updateNetworkStatus('offline');
    }
  }

  private updateNetworkStatus(status: NetworkStatus): void {
    if (this.networkStatus !== status) {
      this.networkStatus = status;
      this.listeners.forEach(listener => listener(status));
    }
  }

  // Queue management
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[Offline] Loaded ${this.queue.length} queued requests`);
      }
    } catch (error) {
      console.error('[Offline] Failed to load queue:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[Offline] Failed to save queue:', error);
    }
  }

  // Add request to queue
  enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queuedRequest: QueuedRequest = {
      ...request,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: request.maxRetries || MAX_RETRIES,
      priority: request.priority || 0,
    };

    // Remove oldest requests if queue is full
    while (this.queue.length >= MAX_QUEUE_SIZE) {
      const removed = this.queue.shift();
      console.log(`[Offline] Queue full, removed request ${removed?.id}`);
    }

    // Insert by priority (higher priority first)
    const insertIndex = this.queue.findIndex(r => r.priority < queuedRequest.priority);
    if (insertIndex === -1) {
      this.queue.push(queuedRequest);
    } else {
      this.queue.splice(insertIndex, 0, queuedRequest);
    }

    this.saveQueue();
    console.log(`[Offline] Queued request ${id}`, request.url);

    return id;
  }

  // Remove request from queue
  dequeue(id: string): boolean {
    const index = this.queue.findIndex(r => r.id === id);
    if (index > -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  // Get all queued requests
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  // Get queue size
  getQueueSize(): number {
    return this.queue.length;
  }

  // Clear entire queue
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  // Sync queued requests
  async syncQueue(): Promise<SyncResult[]> {
    if (this.isSyncing || !this.isOnline || this.queue.length === 0) {
      return [];
    }

    this.isSyncing = true;
    const results: SyncResult[] = [];
    const failedRequests: QueuedRequest[] = [];

    console.log(`[Offline] Syncing ${this.queue.length} queued requests`);

    for (const request of this.queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        const result: SyncResult = {
          success: response.ok,
          request,
          response,
        };

        results.push(result);
        this.syncListeners.forEach(listener => listener(result));

        if (!response.ok && request.retryCount < request.maxRetries) {
          failedRequests.push({
            ...request,
            retryCount: request.retryCount + 1,
          });
        }
      } catch (error) {
        const result: SyncResult = {
          success: false,
          request,
          error: error as Error,
        };

        results.push(result);
        this.syncListeners.forEach(listener => listener(result));

        if (request.retryCount < request.maxRetries) {
          failedRequests.push({
            ...request,
            retryCount: request.retryCount + 1,
          });
        }
      }
    }

    // Replace queue with failed requests
    this.queue = failedRequests;
    this.saveQueue();

    this.isSyncing = false;
    console.log(`[Offline] Sync complete: ${results.filter(r => r.success).length} succeeded, ${failedRequests.length} failed`);

    return results;
  }

  // Event listeners
  onStatusChange(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    listener(this.networkStatus);
    return () => this.listeners.delete(listener);
  }

  onSync(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  // Getters
  getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  getConnectionQuality(): number {
    return this.connectionQuality;
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

// Network Information API type (not in standard lib)
interface NetworkInformation {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
}

// Singleton instance
export const offlineManager = new OfflineManager();

// React hooks
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(offlineManager.getNetworkStatus());
  const [quality, setQuality] = useState(offlineManager.getConnectionQuality());

  useEffect(() => {
    const unsubscribe = offlineManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setQuality(offlineManager.getConnectionQuality());
    });
    return unsubscribe;
  }, []);

  return {
    status,
    quality,
    isOnline: status !== 'offline',
    isSlow: status === 'slow',
  };
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedRequest[]>(offlineManager.getQueue());
  const [isSyncing, setIsSyncing] = useState(offlineManager.getIsSyncing());

  useEffect(() => {
    // Update queue state periodically
    const interval = setInterval(() => {
      setQueue(offlineManager.getQueue());
      setIsSyncing(offlineManager.getIsSyncing());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const enqueue = useCallback((request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>) => {
    const id = offlineManager.enqueue(request);
    setQueue(offlineManager.getQueue());
    return id;
  }, []);

  const dequeue = useCallback((id: string) => {
    const result = offlineManager.dequeue(id);
    setQueue(offlineManager.getQueue());
    return result;
  }, []);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    const results = await offlineManager.syncQueue();
    setQueue(offlineManager.getQueue());
    setIsSyncing(false);
    return results;
  }, []);

  const clear = useCallback(() => {
    offlineManager.clearQueue();
    setQueue([]);
  }, []);

  return {
    queue,
    queueSize: queue.length,
    isSyncing,
    enqueue,
    dequeue,
    sync,
    clear,
  };
}
