import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePendingState, createQueryKey, queryKeys } from '../useOptimistic';

describe('usePendingState', () => {
  it('should start with no pending items', () => {
    const { result } = renderHook(() => usePendingState<string>());

    expect(result.current.hasPending).toBe(false);
    expect(result.current.pendingItems.size).toBe(0);
  });

  it('should add a pending item', () => {
    const { result } = renderHook(() => usePendingState<string>());

    act(() => {
      result.current.addPending('item-1', 'data-1');
    });

    expect(result.current.hasPending).toBe(true);
    expect(result.current.isPending('item-1')).toBe(true);
    expect(result.current.getPending('item-1')).toBe('data-1');
  });

  it('should remove a pending item', () => {
    const { result } = renderHook(() => usePendingState<string>());

    act(() => {
      result.current.addPending('item-1', 'data-1');
      result.current.addPending('item-2', 'data-2');
    });

    act(() => {
      result.current.removePending('item-1');
    });

    expect(result.current.isPending('item-1')).toBe(false);
    expect(result.current.isPending('item-2')).toBe(true);
    expect(result.current.hasPending).toBe(true);
  });

  it('should clear all pending items', () => {
    const { result } = renderHook(() => usePendingState<string>());

    act(() => {
      result.current.addPending('item-1', 'data-1');
      result.current.addPending('item-2', 'data-2');
    });

    act(() => {
      result.current.clearPending();
    });

    expect(result.current.hasPending).toBe(false);
    expect(result.current.pendingItems.size).toBe(0);
  });

  it('should overwrite existing pending item with same id', () => {
    const { result } = renderHook(() => usePendingState<string>());

    act(() => {
      result.current.addPending('item-1', 'original');
    });

    act(() => {
      result.current.addPending('item-1', 'updated');
    });

    expect(result.current.getPending('item-1')).toBe('updated');
    expect(result.current.pendingItems.size).toBe(1);
  });

  it('should return undefined for non-existent pending item', () => {
    const { result } = renderHook(() => usePendingState<string>());

    expect(result.current.getPending('does-not-exist')).toBeUndefined();
    expect(result.current.isPending('does-not-exist')).toBe(false);
  });

  it('should work with complex data types', () => {
    const { result } = renderHook(() =>
      usePendingState<{ name: string; count: number }>()
    );

    act(() => {
      result.current.addPending('item-1', { name: 'test', count: 42 });
    });

    expect(result.current.getPending('item-1')).toEqual({
      name: 'test',
      count: 42,
    });
  });
});

describe('createQueryKey', () => {
  it('should create a key with entity only', () => {
    expect(createQueryKey('agents')).toEqual(['agents']);
  });

  it('should include string params', () => {
    expect(createQueryKey('agents', 'detail', 'abc')).toEqual([
      'agents',
      'detail',
      'abc',
    ]);
  });

  it('should include number params', () => {
    expect(createQueryKey('agents', 'page', 1)).toEqual(['agents', 'page', 1]);
  });

  it('should filter out undefined params', () => {
    expect(createQueryKey('agents', undefined, 'abc')).toEqual([
      'agents',
      'abc',
    ]);
  });

  it('should filter out null params', () => {
    expect(createQueryKey('agents', null, 'abc')).toEqual(['agents', 'abc']);
  });

  it('should filter out mixed null/undefined params', () => {
    expect(createQueryKey('data', undefined, null, 'valid', undefined)).toEqual([
      'data',
      'valid',
    ]);
  });
});

describe('queryKeys factories', () => {
  describe('squads', () => {
    it('should generate all key', () => {
      expect(queryKeys.squads.all()).toEqual(['squads']);
    });

    it('should generate list key', () => {
      expect(queryKeys.squads.list()).toEqual(['squads', 'list']);
    });

    it('should generate detail key', () => {
      expect(queryKeys.squads.detail('s1')).toEqual(['squads', 'detail', 's1']);
    });

    it('should generate stats key', () => {
      expect(queryKeys.squads.stats('s1')).toEqual(['squads', 'stats', 's1']);
    });
  });

  describe('agents', () => {
    it('should generate all key', () => {
      expect(queryKeys.agents.all()).toEqual(['agents']);
    });

    it('should generate list key without filters', () => {
      expect(queryKeys.agents.list()).toEqual(['agents', 'list', undefined]);
    });

    it('should generate list key with squadId filter', () => {
      expect(queryKeys.agents.list({ squadId: 'dev' })).toEqual([
        'agents',
        'list',
        { squadId: 'dev' },
      ]);
    });

    it('should generate detail key', () => {
      expect(queryKeys.agents.detail('a1')).toEqual(['agents', 'detail', 'a1']);
    });

    it('should generate search key', () => {
      expect(queryKeys.agents.search('test')).toEqual([
        'agents',
        'search',
        'test',
      ]);
    });
  });

  describe('chat', () => {
    it('should generate session key', () => {
      expect(queryKeys.chat.session('sess1')).toEqual([
        'chat',
        'session',
        'sess1',
      ]);
    });

    it('should generate messages key', () => {
      expect(queryKeys.chat.messages('sess1')).toEqual([
        'chat',
        'messages',
        'sess1',
      ]);
    });
  });

  describe('workflows', () => {
    it('should generate list key', () => {
      expect(queryKeys.workflows.list()).toEqual(['workflows', 'list']);
    });

    it('should generate executions key', () => {
      expect(queryKeys.workflows.executions('w1')).toEqual([
        'workflows',
        'executions',
        'w1',
      ]);
    });
  });

  describe('dashboard', () => {
    it('should generate overview key', () => {
      expect(queryKeys.dashboard.overview()).toEqual(['dashboard', 'overview']);
    });

    it('should generate metrics key', () => {
      expect(queryKeys.dashboard.metrics()).toEqual(['dashboard', 'metrics']);
    });

    it('should generate health key', () => {
      expect(queryKeys.dashboard.health()).toEqual(['dashboard', 'health']);
    });
  });
});
