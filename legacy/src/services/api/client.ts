import type { ApiError, StreamStartEvent, StreamTextEvent, StreamDoneEvent, StreamErrorEvent, StreamToolsEvent } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Request/Response interceptor types
type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = (response: Response, config: RequestConfig) => Response | Promise<Response>;
type ErrorInterceptor = (error: ApiError, config: RequestConfig) => ApiError | Promise<ApiError>;

interface RequestConfig {
  url: string;
  method: string;
  headers: HeadersInit;
  body?: string;
  signal?: AbortSignal;
  retryCount?: number;
  timeout?: number;
}

export interface StreamCallbacks {
  onStart?: (event: StreamStartEvent) => void;
  onText?: (event: StreamTextEvent) => void;
  onTools?: (event: StreamToolsEvent) => void;
  onDone?: (event: StreamDoneEvent) => void;
  onError?: (event: StreamErrorEvent) => void;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

// API Error types for better handling
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export interface EnhancedApiError extends ApiError {
  code: ApiErrorCode;
  retryable: boolean;
  originalError?: Error;
}

class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  };
  private defaultTimeout = 30000;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.onOnline?.();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.onOffline?.();
      });
    }
  }

  // Callbacks for online/offline state changes
  onOnline?: () => void;
  onOffline?: () => void;

  // Interceptor management
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) this.requestInterceptors.splice(index, 1);
    };
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) this.responseInterceptors.splice(index, 1);
    };
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) this.errorInterceptors.splice(index, 1);
    };
  }

  // Auth methods
  setAuthToken(token: string) {
    this.headers.Authorization = `Bearer ${token}`;
  }

  setApiKey(apiKey: string) {
    this.headers['X-API-Key'] = apiKey;
  }

  clearAuth() {
    delete this.headers.Authorization;
    delete this.headers['X-API-Key'];
  }

  getBaseUrl(): string {
    return this.baseUrl.replace(/\/api$/, '');
  }

  // Configure retry behavior
  setRetryConfig(config: Partial<RetryConfig>) {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  setDefaultTimeout(ms: number) {
    this.defaultTimeout = ms;
  }

  // Check if online
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Classify error
  private classifyError(status: number, error?: Error): ApiErrorCode {
    if (error?.name === 'AbortError') return 'TIMEOUT';
    if (!this.isOnline || error?.message?.includes('network')) return 'NETWORK_ERROR';

    switch (status) {
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 422:
      case 400: return 'VALIDATION_ERROR';
      case 429: return 'RATE_LIMITED';
      case 500:
      case 502:
      case 503:
      case 504: return 'SERVER_ERROR';
      default: return 'UNKNOWN';
    }
  }

  // Calculate retry delay with exponential backoff + jitter
  private getRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, attempt),
      this.retryConfig.maxDelay
    );
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }

  // Sleep helper
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Create timeout signal
  private createTimeoutSignal(timeout: number, existingSignal?: AbortSignal): AbortSignal {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (existingSignal) {
      existingSignal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      });
    }

    return controller.signal;
  }

  // Run request interceptors
  private async runRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let currentConfig = config;
    for (const interceptor of this.requestInterceptors) {
      currentConfig = await interceptor(currentConfig);
    }
    return currentConfig;
  }

  // Run response interceptors
  private async runResponseInterceptors(response: Response, config: RequestConfig): Promise<Response> {
    let currentResponse = response;
    for (const interceptor of this.responseInterceptors) {
      currentResponse = await interceptor(currentResponse, config);
    }
    return currentResponse;
  }

  // Run error interceptors
  private async runErrorInterceptors(error: ApiError, config: RequestConfig): Promise<ApiError> {
    let currentError = error;
    for (const interceptor of this.errorInterceptors) {
      currentError = await interceptor(currentError, config);
    }
    return currentError;
  }

  // Core request method with retry logic
  private async request<T>(config: RequestConfig): Promise<T> {
    // Check online status
    if (!this.isOnline) {
      const error: EnhancedApiError = {
        error: 'Network Error',
        message: 'Sem conexão com a internet',
        status: 0,
        code: 'NETWORK_ERROR',
        retryable: true,
      };
      throw await this.runErrorInterceptors(error, config);
    }

    // Run request interceptors
    config = await this.runRequestInterceptors(config);

    const retryCount = config.retryCount || 0;
    const timeout = config.timeout || this.defaultTimeout;

    try {
      const signal = this.createTimeoutSignal(timeout, config.signal);

      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal,
      });

      // Run response interceptors
      const processedResponse = await this.runResponseInterceptors(response, config);

      if (!processedResponse.ok) {
        const errorCode = this.classifyError(processedResponse.status);
        const isRetryable = this.retryConfig.retryableStatuses.includes(processedResponse.status);

        // Attempt retry for retryable errors
        if (isRetryable && retryCount < this.retryConfig.maxRetries) {
          const delay = this.getRetryDelay(retryCount);
          console.log(`[API] Retrying request (${retryCount + 1}/${this.retryConfig.maxRetries}) after ${delay}ms`);
          await this.sleep(delay);
          return this.request<T>({ ...config, retryCount: retryCount + 1 });
        }

        // Parse error response
        let errorData: Partial<EnhancedApiError> = {};
        try {
          errorData = await processedResponse.json();
        } catch {
          errorData = { message: processedResponse.statusText };
        }

        const error: EnhancedApiError = {
          error: errorData.error || 'Request Failed',
          message: errorData.message || 'A requisição falhou',
          status: processedResponse.status,
          code: errorCode,
          retryable: isRetryable,
          details: errorData.details,
        };

        throw await this.runErrorInterceptors(error, config);
      }

      // Handle empty responses
      const text = await processedResponse.text();
      if (!text) return {} as T;

      return JSON.parse(text);
    } catch (error) {
      // Handle abort/timeout
      if ((error as Error).name === 'AbortError') {
        const timeoutError: EnhancedApiError = {
          error: 'Timeout',
          message: 'A requisição excedeu o tempo limite',
          status: 408,
          code: 'TIMEOUT',
          retryable: true,
          originalError: error as Error,
        };

        // Retry timeout errors
        if (retryCount < this.retryConfig.maxRetries) {
          const delay = this.getRetryDelay(retryCount);
          console.log(`[API] Retrying after timeout (${retryCount + 1}/${this.retryConfig.maxRetries})`);
          await this.sleep(delay);
          return this.request<T>({ ...config, retryCount: retryCount + 1 });
        }

        throw await this.runErrorInterceptors(timeoutError, config);
      }

      // Handle network errors
      if ((error as Error).message?.includes('fetch')) {
        const networkError: EnhancedApiError = {
          error: 'Network Error',
          message: 'Erro de conexão com o servidor',
          status: 0,
          code: 'NETWORK_ERROR',
          retryable: true,
          originalError: error as Error,
        };

        if (retryCount < this.retryConfig.maxRetries) {
          const delay = this.getRetryDelay(retryCount);
          console.log(`[API] Retrying after network error (${retryCount + 1}/${this.retryConfig.maxRetries})`);
          await this.sleep(delay);
          return this.request<T>({ ...config, retryCount: retryCount + 1 });
        }

        throw await this.runErrorInterceptors(networkError, config);
      }

      // Re-throw if already an ApiError
      if ((error as EnhancedApiError).code) {
        throw error;
      }

      // Wrap unknown errors
      const unknownError: EnhancedApiError = {
        error: 'Unknown Error',
        message: (error as Error).message || 'Erro desconhecido',
        status: 0,
        code: 'UNKNOWN',
        retryable: false,
        originalError: error as Error,
      };

      throw await this.runErrorInterceptors(unknownError, config);
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, params?: Record<string, string | number | undefined>, options?: { timeout?: number; signal?: AbortSignal }): Promise<T> {
    let url = `${this.baseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    return this.request<T>({
      url,
      method: 'GET',
      headers: this.headers,
      ...options,
    });
  }

  async post<T>(endpoint: string, data?: unknown, options?: { timeout?: number; signal?: AbortSignal }): Promise<T> {
    const headers = data !== undefined ? this.headers : (() => {
      const { 'Content-Type': _, ...rest } = this.headers;
      return rest;
    })();

    return this.request<T>({
      url: `${this.baseUrl}${endpoint}`,
      method: 'POST',
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: { timeout?: number; signal?: AbortSignal }): Promise<T> {
    return this.request<T>({
      url: `${this.baseUrl}${endpoint}`,
      method: 'PUT',
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: { timeout?: number; signal?: AbortSignal }): Promise<T> {
    return this.request<T>({
      url: `${this.baseUrl}${endpoint}`,
      method: 'PATCH',
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(endpoint: string, options?: { timeout?: number; signal?: AbortSignal }): Promise<T> {
    return this.request<T>({
      url: `${this.baseUrl}${endpoint}`,
      method: 'DELETE',
      headers: this.headers,
      ...options,
    });
  }

  // SSE streaming for agent responses
  async stream(
    endpoint: string,
    data: unknown,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const { onStart, onText, onTools, onDone, onError } = callbacks;

    if (!this.isOnline) {
      onError?.({ error: 'Sem conexão com a internet' });
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          ...this.headers,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(data),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (signal?.aborted) {
          reader.cancel();
          return;
        }

        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            try {
              const parsed = JSON.parse(dataStr);

              switch (currentEvent) {
                case 'start':
                  onStart?.(parsed as StreamStartEvent);
                  break;
                case 'text':
                  onText?.(parsed as StreamTextEvent);
                  break;
                case 'tools':
                  onTools?.(parsed as StreamToolsEvent);
                  break;
                case 'done':
                  onDone?.(parsed as StreamDoneEvent);
                  return;
                case 'error':
                  onError?.(parsed as StreamErrorEvent);
                  return;
                default:
                  if (parsed.content) {
                    onText?.({ content: parsed.content });
                  }
              }
            } catch {
              if (dataStr && dataStr !== '[DONE]') {
                onText?.({ content: dataStr });
              }
              if (dataStr === '[DONE]') return;
            }

            currentEvent = '';
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      onError?.({ error: (error as Error).message });
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Setup default interceptors
apiClient.addRequestInterceptor((config) => {
  // Add timestamp for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${config.method} ${config.url}`);
  }
  return config;
});

apiClient.addErrorInterceptor((error) => {
  // Log errors in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', error.code, error.message);
  }
  return error;
});
