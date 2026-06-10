import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Supabase mock ----
// vi.mock is hoisted above all variable declarations, so we must use vi.hoisted()
// to declare shared mutable state that the mock factory can reference.

const { mockResult, queryBuilder, mockFrom } = vi.hoisted(() => {
  const mockResult = { data: null as unknown, error: null as unknown, count: null as number | null };

  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
  };

  // Wire up the chain: every method returns an object containing all other
  // methods so any chaining order works. Awaiting the chain resolves to mockResult.
  function wireChain(): void {
    const chain: Record<string, unknown> = {
      then: (resolve: (v: typeof mockResult) => void) => resolve(mockResult),
    };
    for (const key of Object.keys(queryBuilder)) {
      chain[key] = queryBuilder[key];
    }
    for (const fn of Object.values(queryBuilder)) {
      fn.mockReturnValue(chain);
    }
  }

  const mockFrom = vi.fn().mockImplementation(() => {
    wireChain();
    return {
      select: queryBuilder.select,
      insert: queryBuilder.insert,
      upsert: queryBuilder.upsert,
    };
  });

  return { mockResult, queryBuilder, mockFrom };
});

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: mockFrom,
  },
}));

import { supabaseTasksService } from '../supabase/tasks';
import type { Task } from '../api/tasks';

// Helper to build a minimal Task object
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    demand: 'Build login page',
    status: 'completed',
    squads: [],
    workflow: null,
    outputs: [],
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper to build a DB row matching OrchestrationTaskRow shape
function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    task_id: 'task-1',
    demand: 'Build login page',
    status: 'completed',
    squads: [],
    outputs: [],
    workflow_id: null,
    execution_id: null,
    session_id: null,
    user_id: null,
    current_step: null,
    step_count: 0,
    completed_steps: 0,
    total_tokens: 100,
    total_duration_ms: 5000,
    error_message: null,
    final_result: null,
    started_at: '2025-01-01T00:00:01Z',
    completed_at: '2025-01-01T00:01:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:01:00Z',
    ...overrides,
  };
}

describe('supabaseTasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset terminal result
    mockResult.data = null;
    mockResult.error = null;
    mockResult.count = null;
  });

  // ---- isAvailable ----

  describe('isAvailable', () => {
    it('should return true when supabase is configured', () => {
      expect(supabaseTasksService.isAvailable()).toBe(true);
    });
  });

  // ---- upsertTask ----

  describe('upsertTask', () => {
    it('should call supabase.from("orchestration_tasks").upsert() with converted row', async () => {
      mockResult.error = null;

      await supabaseTasksService.upsertTask(makeTask());

      expect(mockFrom).toHaveBeenCalledWith('orchestration_tasks');
      expect(queryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ task_id: 'task-1', demand: 'Build login page' }),
        { onConflict: 'task_id' },
      );
    });

    it('should log error when upsert fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockResult.error = { message: 'unique violation' };

      await supabaseTasksService.upsertTask(makeTask());

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Supabase] Failed to upsert task:',
        'unique violation',
      );
      consoleSpy.mockRestore();
    });
  });

  // ---- getTask ----

  describe('getTask', () => {
    it('should query by task_id and return a converted Task', async () => {
      const row = makeRow();
      mockResult.data = row;
      mockResult.error = null;

      const task = await supabaseTasksService.getTask('task-1');

      expect(mockFrom).toHaveBeenCalledWith('orchestration_tasks');
      expect(queryBuilder.select).toHaveBeenCalledWith('*');
      expect(queryBuilder.eq).toHaveBeenCalledWith('task_id', 'task-1');
      expect(queryBuilder.single).toHaveBeenCalled();

      expect(task).not.toBeNull();
      expect(task!.id).toBe('task-1');
      expect(task!.demand).toBe('Build login page');
      expect(task!.status).toBe('completed');
    });

    it('should return null when the task is not found', async () => {
      mockResult.data = null;
      mockResult.error = { message: 'not found' };

      const task = await supabaseTasksService.getTask('nonexistent');
      expect(task).toBeNull();
    });
  });

  // ---- listTasks ----

  describe('listTasks', () => {
    it('should build query with default limit and offset', async () => {
      const rows = [makeRow()];
      mockResult.data = rows;
      mockResult.error = null;
      mockResult.count = 1;

      const result = await supabaseTasksService.listTasks();

      expect(mockFrom).toHaveBeenCalledWith('orchestration_tasks');
      expect(queryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(queryBuilder.range).toHaveBeenCalledWith(0, 19); // offset 0, limit 20 -> range(0, 19)

      expect(result).not.toBeNull();
      expect(result!.tasks).toHaveLength(1);
      expect(result!.total).toBe(1);
      expect(result!.limit).toBe(20);
      expect(result!.offset).toBe(0);
      expect(result!.dbPersistence).toBe(true);
    });

    it('should apply status filter when provided', async () => {
      mockResult.data = [];
      mockResult.error = null;
      mockResult.count = 0;

      await supabaseTasksService.listTasks({ status: 'failed' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'failed');
    });

    it('should apply search filter with ilike when provided', async () => {
      mockResult.data = [];
      mockResult.error = null;
      mockResult.count = 0;

      await supabaseTasksService.listTasks({ search: 'login' });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('demand', '%login%');
    });

    it('should return null on error', async () => {
      mockResult.data = null;
      mockResult.error = { message: 'db error' };
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await supabaseTasksService.listTasks();
      expect(result).toBeNull();
    });
  });

  // ---- persistCompletedTask ----

  describe('persistCompletedTask', () => {
    it('should upsert with completed_at defaulting to now when not set', async () => {
      mockResult.error = null;

      const task = makeTask({ completedAt: undefined });
      await supabaseTasksService.persistCompletedTask(task);

      expect(queryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: 'task-1',
          completed_at: expect.any(String), // ISO string
        }),
        { onConflict: 'task_id' },
      );

      // The completed_at should be an ISO date string
      const row = queryBuilder.upsert.mock.calls[0][0];
      expect(new Date(row.completed_at).toISOString()).toBe(row.completed_at);
    });

    it('should preserve existing completed_at when already set', async () => {
      mockResult.error = null;

      const task = makeTask({ completedAt: '2025-06-01T12:00:00Z' });
      await supabaseTasksService.persistCompletedTask(task);

      const row = queryBuilder.upsert.mock.calls[0][0];
      expect(row.completed_at).toBe('2025-06-01T12:00:00Z');
    });
  });

  // ---- getMetrics ----

  describe('getMetrics', () => {
    it('should compute aggregate metrics from rows', async () => {
      mockResult.data = [
        { status: 'completed', total_duration_ms: 2000, total_tokens: 50 },
        { status: 'completed', total_duration_ms: 4000, total_tokens: 100 },
        { status: 'failed', total_duration_ms: 1000, total_tokens: 30 },
        { status: 'pending', total_duration_ms: 0, total_tokens: 0 },
      ];
      mockResult.error = null;

      const metrics = await supabaseTasksService.getMetrics();

      expect(metrics).not.toBeNull();
      expect(metrics!.total).toBe(4);
      expect(metrics!.completed).toBe(2);
      expect(metrics!.failed).toBe(1);
      expect(metrics!.avgDuration).toBe(3000); // (2000 + 4000) / 2
      expect(metrics!.totalTokens).toBe(180); // 50 + 100 + 30 + 0
    });

    it('should return avgDuration 0 when there are no completed tasks', async () => {
      mockResult.data = [
        { status: 'pending', total_duration_ms: 0, total_tokens: 10 },
      ];
      mockResult.error = null;

      const metrics = await supabaseTasksService.getMetrics();

      expect(metrics!.avgDuration).toBe(0);
      expect(metrics!.completed).toBe(0);
    });

    it('should return null on error', async () => {
      mockResult.data = null;
      mockResult.error = { message: 'connection refused' };

      const metrics = await supabaseTasksService.getMetrics();
      expect(metrics).toBeNull();
    });
  });
});
