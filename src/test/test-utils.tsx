/* eslint-disable react-refresh/only-export-components */
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

// All providers wrapper
function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Custom render with providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, userEvent };

// Test utilities
export function createMockResponse<T>(data: T, options?: Partial<Response>): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => createMockResponse(data, options),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    ...options,
  } as Response;
}

export function createMockErrorResponse(status: number, message: string): Response {
  return createMockResponse(
    { error: message, message },
    { ok: false, status, statusText: message }
  );
}

// Wait for async operations
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock fetch helper
export function mockFetch(responses: Array<Response | Error>) {
  let callIndex = 0;

  return (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;

    if (response instanceof Error) {
      return Promise.reject(response);
    }
    return Promise.resolve(response);
  });
}

// Create mock event
export function createMockEvent<T extends Event>(
  type: string,
  props: Partial<T> = {}
): T {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, props);
  return event as T;
}

// Import vi for mocking
import { vi } from 'vitest';
