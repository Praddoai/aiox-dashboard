import { describe, it, expect, beforeEach } from 'vitest';
import { useRoadmapStore } from '../roadmapStore';

describe('roadmapStore', () => {
  beforeEach(() => {
    useRoadmapStore.setState({ filter: 'all', viewMode: 'timeline' });
  });

  it('should have sample features', () => {
    expect(useRoadmapStore.getState().features.length).toBeGreaterThan(0);
  });

  it('should set filter', () => {
    useRoadmapStore.getState().setFilter('must');
    expect(useRoadmapStore.getState().filter).toBe('must');
  });

  it('should set view mode', () => {
    useRoadmapStore.getState().setViewMode('cards');
    expect(useRoadmapStore.getState().viewMode).toBe('cards');
  });

  it('should add a feature', () => {
    const count = useRoadmapStore.getState().features.length;
    useRoadmapStore.getState().addFeature({
      id: 'test-1',
      title: 'Test Feature',
      description: 'desc',
      priority: 'should',
      impact: 'medium',
      effort: 'low',
      tags: ['test'],
      status: 'planned',
    });
    expect(useRoadmapStore.getState().features.length).toBe(count + 1);
  });

  it('should remove a feature', () => {
    const count = useRoadmapStore.getState().features.length;
    const firstId = useRoadmapStore.getState().features[0].id;
    useRoadmapStore.getState().removeFeature(firstId);
    expect(useRoadmapStore.getState().features.length).toBe(count - 1);
  });
});
