'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient, useMutation, type UseMutationOptions } from '@tanstack/react-query';

/**
 * Hook for optimistic updates with automatic rollback on error
 */
export function useOptimisticUpdate<TData, TVariables, TContext = unknown>(
  queryKey: unknown[],
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    optimisticUpdate?: (variables: TVariables, oldData: TData | undefined) => TData;
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
    onError?: (error: Error, variables: TVariables, context: TContext) => void;
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables, context: TContext) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update
      if (options?.optimisticUpdate) {
        queryClient.setQueryData<TData>(
          queryKey,
          (old) => options.optimisticUpdate!(variables, old)
        );
      }

      return { previousData } as TContext;
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if ((context as { previousData?: TData })?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, (context as { previousData: TData }).previousData);
      }
      options?.onError?.(error as Error, variables, context as TContext);
    },
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data, variables, context as TContext);
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey });
      options?.onSettled?.(data, error as Error | null, variables, context as TContext);
    },
  });
}

/**
 * Hook for optimistic list operations (add, update, remove)
 */
export function useOptimisticList<TItem extends { id: string }>(
  queryKey: unknown[]
) {
  const queryClient = useQueryClient();

  const addOptimistic = useCallback(
    (item: TItem) => {
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) => [...old, item]);
    },
    [queryClient, queryKey]
  );

  const updateOptimistic = useCallback(
    (id: string, updates: Partial<TItem>) => {
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    [queryClient, queryKey]
  );

  const removeOptimistic = useCallback(
    (id: string) => {
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.filter((item) => item.id !== id)
      );
    },
    [queryClient, queryKey]
  );

  const rollback = useCallback(
    (previousData: TItem[]) => {
      queryClient.setQueryData(queryKey, previousData);
    },
    [queryClient, queryKey]
  );

  const getSnapshot = useCallback(
    () => queryClient.getQueryData<TItem[]>(queryKey) || [],
    [queryClient, queryKey]
  );

  return {
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    rollback,
    getSnapshot,
  };
}

/**
 * Hook for managing pending state during optimistic operations
 */
export function usePendingState<T>() {
  const [pendingItems, setPendingItems] = useState<Map<string, T>>(new Map());

  const addPending = useCallback((id: string, data: T) => {
    setPendingItems((prev) => new Map(prev).set(id, data));
  }, []);

  const removePending = useCallback((id: string) => {
    setPendingItems((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearPending = useCallback(() => {
    setPendingItems(new Map());
  }, []);

  const isPending = useCallback(
    (id: string) => pendingItems.has(id),
    [pendingItems]
  );

  const getPending = useCallback(
    (id: string) => pendingItems.get(id),
    [pendingItems]
  );

  return {
    pendingItems,
    addPending,
    removePending,
    clearPending,
    isPending,
    getPending,
    hasPending: pendingItems.size > 0,
  };
}

/**
 * Hook for debounced mutations (useful for auto-save)
 */
export function useDebouncedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  delay: number = 500,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingVariablesRef = useRef<TVariables | null>(null);
  const [hasPending, setHasPending] = useState(false);

  const mutation = useMutation({
    mutationFn,
    ...options,
  });

  const debouncedMutate = useCallback(
    (variables: TVariables) => {
      pendingVariablesRef.current = variables;
      setHasPending(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (pendingVariablesRef.current !== null) {
          mutation.mutate(pendingVariablesRef.current);
          pendingVariablesRef.current = null;
          setHasPending(false);
        }
      }, delay);
    },
    [mutation, delay]
  );

  const flushNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (pendingVariablesRef.current !== null) {
      mutation.mutate(pendingVariablesRef.current);
      pendingVariablesRef.current = null;
      setHasPending(false);
    }
  }, [mutation]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    pendingVariablesRef.current = null;
    setHasPending(false);
  }, []);

  return {
    ...mutation,
    debouncedMutate,
    flushNow,
    cancel,
    hasPending,
  };
}

/**
 * Hook for managing cache invalidation patterns
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    (queryKey: unknown[]) => {
      return queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  const invalidateAll = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: [] });
  }, [queryClient]);

  const invalidateMatching = useCallback(
    (predicate: (queryKey: unknown[]) => boolean) => {
      return queryClient.invalidateQueries({
        queryKey: [],
        predicate: (query) => predicate(query.queryKey as unknown[]),
      });
    },
    [queryClient]
  );

  const prefetch = useCallback(
    <T>(queryKey: unknown[], queryFn: () => Promise<T>, staleTime?: number) => {
      return queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
    },
    [queryClient]
  );

  const setCache = useCallback(
    <T>(queryKey: unknown[], data: T) => {
      queryClient.setQueryData(queryKey, data);
    },
    [queryClient]
  );

  const getCache = useCallback(
    <T>(queryKey: unknown[]): T | undefined => {
      return queryClient.getQueryData<T>(queryKey);
    },
    [queryClient]
  );

  const removeCache = useCallback(
    (queryKey: unknown[]) => {
      queryClient.removeQueries({ queryKey });
    },
    [queryClient]
  );

  return {
    invalidate,
    invalidateAll,
    invalidateMatching,
    prefetch,
    setCache,
    getCache,
    removeCache,
  };
}

/**
 * Utility to create query keys with consistent structure
 */
export function createQueryKey(
  entity: string,
  ...params: (string | number | undefined | null)[]
): unknown[] {
  return [entity, ...params.filter((p) => p !== undefined && p !== null)];
}

// Predefined query key factories
export const queryKeys = {
  // Squads
  squads: {
    all: () => ['squads'] as const,
    list: () => [...queryKeys.squads.all(), 'list'] as const,
    detail: (id: string) => [...queryKeys.squads.all(), 'detail', id] as const,
    stats: (id: string) => [...queryKeys.squads.all(), 'stats', id] as const,
  },

  // Agents
  agents: {
    all: () => ['agents'] as const,
    list: (filters?: { squadId?: string }) => [...queryKeys.agents.all(), 'list', filters] as const,
    detail: (id: string) => [...queryKeys.agents.all(), 'detail', id] as const,
    search: (query: string) => [...queryKeys.agents.all(), 'search', query] as const,
  },

  // Chat
  chat: {
    all: () => ['chat'] as const,
    sessions: () => [...queryKeys.chat.all(), 'sessions'] as const,
    session: (id: string) => [...queryKeys.chat.all(), 'session', id] as const,
    messages: (sessionId: string) => [...queryKeys.chat.all(), 'messages', sessionId] as const,
  },

  // Workflows
  workflows: {
    all: () => ['workflows'] as const,
    list: () => [...queryKeys.workflows.all(), 'list'] as const,
    detail: (id: string) => [...queryKeys.workflows.all(), 'detail', id] as const,
    executions: (id: string) => [...queryKeys.workflows.all(), 'executions', id] as const,
  },

  // Dashboard
  dashboard: {
    all: () => ['dashboard'] as const,
    overview: () => [...queryKeys.dashboard.all(), 'overview'] as const,
    metrics: () => [...queryKeys.dashboard.all(), 'metrics'] as const,
    health: () => [...queryKeys.dashboard.all(), 'health'] as const,
  },
};
