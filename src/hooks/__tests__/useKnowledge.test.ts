import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  formatFileSize,
  FILE_TYPE_COLORS,
  useKnowledgeSearch,
} from '../useKnowledge';
import type { KnowledgeOverview } from '../useKnowledge';

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(2560)).toBe('2.5 KB');
    expect(formatFileSize(1024 * 512)).toBe('512.0 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });
});

describe('FILE_TYPE_COLORS', () => {
  it('should have colors for common file types', () => {
    expect(FILE_TYPE_COLORS['md']).toBeDefined();
    expect(FILE_TYPE_COLORS['yaml']).toBeDefined();
    expect(FILE_TYPE_COLORS['json']).toBeDefined();
    expect(FILE_TYPE_COLORS['ts']).toBeDefined();
    expect(FILE_TYPE_COLORS['tsx']).toBeDefined();
    expect(FILE_TYPE_COLORS['js']).toBeDefined();
  });

  it('should use same color for yaml and yml', () => {
    expect(FILE_TYPE_COLORS['yaml']).toBe(FILE_TYPE_COLORS['yml']);
  });

  it('should use same color for ts and tsx', () => {
    expect(FILE_TYPE_COLORS['ts']).toBe(FILE_TYPE_COLORS['tsx']);
  });
});

describe('useKnowledgeSearch', () => {
  const mockOverview: KnowledgeOverview = {
    totalFiles: 5,
    totalDirectories: 2,
    totalSize: 50000,
    byExtension: { md: 3, ts: 2 },
    recentFiles: [
      { name: 'README.md', path: 'README.md', size: 4800, modified: '2026-01-01T00:00:00Z', extension: 'md' },
      { name: 'guide.md', path: 'docs/guide.md', size: 3200, modified: '2026-01-01T01:00:00Z', extension: 'md' },
      { name: 'helpers.ts', path: 'src/helpers.ts', size: 5600, modified: '2026-01-01T02:00:00Z', extension: 'ts' },
      { name: 'config.json', path: 'config.json', size: 1200, modified: '2026-01-01T03:00:00Z', extension: 'json' },
      { name: 'api-spec.yaml', path: 'specs/api-spec.yaml', size: 8200, modified: '2026-01-01T04:00:00Z', extension: 'yaml' },
    ],
  };

  it('should return all files with no query or filter', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockOverview));
    expect(result.current.recentFilesFiltered).toHaveLength(5);
    expect(result.current.hasFilters).toBe(false);
  });

  it('should filter by query string (name match)', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockOverview));

    act(() => result.current.setQuery('guide'));

    expect(result.current.recentFilesFiltered).toHaveLength(1);
    expect(result.current.recentFilesFiltered[0].name).toBe('guide.md');
    expect(result.current.hasFilters).toBe(true);
  });

  it('should filter by query string (path match)', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockOverview));

    act(() => result.current.setQuery('docs/'));

    expect(result.current.recentFilesFiltered).toHaveLength(1);
    expect(result.current.recentFilesFiltered[0].path).toContain('docs/');
  });

  it('should be case-insensitive', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockOverview));

    act(() => result.current.setQuery('README'));

    expect(result.current.recentFilesFiltered).toHaveLength(1);
  });

  it('should filter by file type', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockOverview));

    act(() => result.current.setFilterType('md'));

    expect(result.current.recentFilesFiltered).toHaveLength(2);
    expect(result.current.recentFilesFiltered.every(f => f.extension === 'md')).toBe(true);
    expect(result.current.hasFilters).toBe(true);
  });

  it('should combine query and type filter', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockOverview));

    act(() => {
      result.current.setQuery('guide');
      result.current.setFilterType('md');
    });

    expect(result.current.recentFilesFiltered).toHaveLength(1);
    expect(result.current.recentFilesFiltered[0].name).toBe('guide.md');
  });

  it('should return empty for no matches', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockOverview));

    act(() => result.current.setQuery('nonexistent'));

    expect(result.current.recentFilesFiltered).toHaveLength(0);
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockOverview));

    act(() => {
      result.current.setQuery('guide');
      result.current.setFilterType('md');
    });

    expect(result.current.hasFilters).toBe(true);

    act(() => result.current.clearFilters());

    expect(result.current.query).toBe('');
    expect(result.current.filterType).toBeNull();
    expect(result.current.hasFilters).toBe(false);
    expect(result.current.recentFilesFiltered).toHaveLength(5);
  });

  it('should handle undefined overview', () => {
    const { result } = renderHook(() => useKnowledgeSearch(undefined));
    expect(result.current.recentFilesFiltered).toEqual([]);
  });

  it('should handle overview without recentFiles', () => {
    const empty: KnowledgeOverview = {
      totalFiles: 0,
      totalDirectories: 0,
      totalSize: 0,
      byExtension: {},
      recentFiles: [],
    };
    const { result } = renderHook(() => useKnowledgeSearch(empty));
    expect(result.current.recentFilesFiltered).toEqual([]);
  });
});
