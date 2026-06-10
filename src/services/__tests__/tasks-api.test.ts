import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:4001'),
  },
}));

import { apiClient } from '../api/client';
import { tasksApi } from '../api/tasks';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockGetBaseUrl = apiClient.getBaseUrl as ReturnType<typeof vi.fn>;

describe('tasksApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBaseUrl.mockReturnValue('http://localhost:4001');
  });

  // --- createTask ---

  describe('createTask', () => {
    it('should call POST /tasks with demand only', async () => {
      const response = { taskId: 'task-1', status: 'pending', message: 'Task created', dbPersistence: true };
      mockPost.mockResolvedValue(response);

      const result = await tasksApi.createTask('Build a landing page');

      expect(mockPost).toHaveBeenCalledWith('/tasks', {
        demand: 'Build a landing page',
        options: undefined,
      });
      expect(result).toEqual(response);
    });

    it('should call POST /tasks with demand and options', async () => {
      const options = { priority: 'high', squad: 'development' };
      const response = { taskId: 'task-2', status: 'pending', message: 'Task created', dbPersistence: true };
      mockPost.mockResolvedValue(response);

      const result = await tasksApi.createTask('Fix login bug', options);

      expect(mockPost).toHaveBeenCalledWith('/tasks', {
        demand: 'Fix login bug',
        options,
      });
      expect(result).toEqual(response);
    });
  });

  // --- getTask ---

  describe('getTask', () => {
    it('should call GET /tasks/:taskId', async () => {
      const task = {
        id: 'task-1',
        demand: 'Build a landing page',
        status: 'completed',
        squads: [],
        workflow: null,
        outputs: [],
        createdAt: '2025-01-01T00:00:00Z',
      };
      mockGet.mockResolvedValue(task);

      const result = await tasksApi.getTask('task-1');

      expect(mockGet).toHaveBeenCalledWith('/tasks/task-1');
      expect(result).toEqual(task);
    });

    it('should propagate errors from apiClient', async () => {
      mockGet.mockRejectedValue(new Error('Not found'));

      await expect(tasksApi.getTask('nonexistent')).rejects.toThrow('Not found');
    });
  });

  // --- listTasks ---

  describe('listTasks', () => {
    it('should call GET /tasks without query string when no params', async () => {
      const response = { tasks: [], total: 0, limit: 20, offset: 0, dbPersistence: true };
      mockGet.mockResolvedValue(response);

      const result = await tasksApi.listTasks();

      expect(mockGet).toHaveBeenCalledWith('/tasks');
      expect(result).toEqual(response);
    });

    it('should call GET /tasks without query string when params is undefined', async () => {
      mockGet.mockResolvedValue({ tasks: [], total: 0, limit: 20, offset: 0, dbPersistence: true });

      await tasksApi.listTasks(undefined);

      expect(mockGet).toHaveBeenCalledWith('/tasks');
    });

    it('should append status to query string', async () => {
      mockGet.mockResolvedValue({ tasks: [], total: 0, limit: 20, offset: 0, dbPersistence: true });

      await tasksApi.listTasks({ status: 'completed' });

      expect(mockGet).toHaveBeenCalledWith('/tasks?status=completed');
    });

    it('should append limit and offset to query string', async () => {
      mockGet.mockResolvedValue({ tasks: [], total: 0, limit: 10, offset: 5, dbPersistence: true });

      await tasksApi.listTasks({ limit: 10, offset: 5 });

      const calledUrl = mockGet.mock.calls[0][0] as string;
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('offset=5');
    });

    it('should build full query string with all params', async () => {
      mockGet.mockResolvedValue({ tasks: [], total: 0, limit: 10, offset: 0, dbPersistence: true });

      await tasksApi.listTasks({ status: 'executing', limit: 10, offset: 20 });

      const calledUrl = mockGet.mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=executing');
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('offset=20');
      expect(calledUrl.startsWith('/tasks?')).toBe(true);
    });

    it('should skip falsy params in query string', async () => {
      mockGet.mockResolvedValue({ tasks: [], total: 0, limit: 20, offset: 0, dbPersistence: true });

      await tasksApi.listTasks({ status: undefined, limit: undefined, offset: undefined });

      expect(mockGet).toHaveBeenCalledWith('/tasks');
    });
  });

  // --- getTaskStreamUrl ---

  describe('getTaskStreamUrl', () => {
    it('should return the SSE stream URL for a specific task', () => {
      const url = tasksApi.getTaskStreamUrl('task-42');

      expect(mockGetBaseUrl).toHaveBeenCalled();
      expect(url).toBe('http://localhost:4001/api/tasks/task-42/stream');
    });

    it('should use the current base URL', () => {
      mockGetBaseUrl.mockReturnValue('https://api.example.com');

      const url = tasksApi.getTaskStreamUrl('task-99');

      expect(url).toBe('https://api.example.com/api/tasks/task-99/stream');
    });
  });

  // --- getAllTasksStreamUrl ---

  describe('getAllTasksStreamUrl', () => {
    it('should return the SSE stream URL for all tasks', () => {
      const url = tasksApi.getAllTasksStreamUrl();

      expect(mockGetBaseUrl).toHaveBeenCalled();
      expect(url).toBe('http://localhost:4001/api/tasks/stream');
    });
  });
});
