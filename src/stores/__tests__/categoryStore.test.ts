import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCategoryStore } from '../categoryStore';
import type { CategoryConfig } from '../categoryStore';

vi.mock('../../lib/safeStorage', () => ({
  safePersistStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
}));

const testCategories: CategoryConfig[] = [
  { id: 'cat-a', name: 'Category A', icon: 'Box', squadType: 'development', squads: ['squad-1', 'squad-2'] },
  { id: 'cat-b', name: 'Category B', icon: 'Star', squadType: 'design', squads: ['squad-3'] },
  { id: 'cat-c', name: 'Category C', icon: 'Zap', squadType: 'orchestrator', squads: [] },
];

describe('categoryStore', () => {
  beforeEach(() => {
    useCategoryStore.setState({ categories: structuredClone(testCategories) });
  });

  it('should have default categories on initial load', () => {
    // Reset to real defaults by calling resetToDefaults
    useCategoryStore.getState().resetToDefaults();
    const { categories } = useCategoryStore.getState();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty('id');
    expect(categories[0]).toHaveProperty('name');
    expect(categories[0]).toHaveProperty('squads');
  });

  it('should add a category with empty squads', () => {
    useCategoryStore.getState().addCategory({
      id: 'cat-new',
      name: 'New Category',
      icon: 'Plus',
      squadType: 'content',
    });

    const { categories } = useCategoryStore.getState();
    expect(categories).toHaveLength(4);
    const added = categories.find((c) => c.id === 'cat-new');
    expect(added).toBeDefined();
    expect(added!.name).toBe('New Category');
    expect(added!.squads).toEqual([]);
  });

  it('should update a category', () => {
    useCategoryStore.getState().updateCategory('cat-a', { name: 'Updated A', icon: 'Edit' });

    const cat = useCategoryStore.getState().categories.find((c) => c.id === 'cat-a');
    expect(cat!.name).toBe('Updated A');
    expect(cat!.icon).toBe('Edit');
    // Other fields unchanged
    expect(cat!.squads).toEqual(['squad-1', 'squad-2']);
  });

  it('should delete a category', () => {
    useCategoryStore.getState().deleteCategory('cat-b');

    const { categories } = useCategoryStore.getState();
    expect(categories).toHaveLength(2);
    expect(categories.find((c) => c.id === 'cat-b')).toBeUndefined();
  });

  it('should move a squad from one category to another', () => {
    useCategoryStore.getState().moveSquadToCategory('squad-1', 'cat-a', 'cat-c');

    const { categories } = useCategoryStore.getState();
    const catA = categories.find((c) => c.id === 'cat-a')!;
    const catC = categories.find((c) => c.id === 'cat-c')!;
    expect(catA.squads).not.toContain('squad-1');
    expect(catC.squads).toContain('squad-1');
  });

  it('should move a squad from null source to a target', () => {
    useCategoryStore.getState().moveSquadToCategory('squad-new', null, 'cat-c');

    const catC = useCategoryStore.getState().categories.find((c) => c.id === 'cat-c')!;
    expect(catC.squads).toContain('squad-new');
  });

  it('should not add duplicate squad when moving to a category that already has it', () => {
    useCategoryStore.getState().moveSquadToCategory('squad-3', null, 'cat-b');

    const catB = useCategoryStore.getState().categories.find((c) => c.id === 'cat-b')!;
    expect(catB.squads).toEqual(['squad-3']);
  });

  it('should reorder squads in a category', () => {
    useCategoryStore.getState().reorderSquadsInCategory('cat-a', ['squad-2', 'squad-1']);

    const catA = useCategoryStore.getState().categories.find((c) => c.id === 'cat-a')!;
    expect(catA.squads).toEqual(['squad-2', 'squad-1']);
  });

  it('should reorder categories by id list', () => {
    useCategoryStore.getState().reorderCategories(['cat-c', 'cat-a', 'cat-b']);

    const ids = useCategoryStore.getState().categories.map((c) => c.id);
    expect(ids).toEqual(['cat-c', 'cat-a', 'cat-b']);
  });

  it('should get the category id for a squad', () => {
    expect(useCategoryStore.getState().getSquadCategory('squad-3')).toBe('cat-b');
    expect(useCategoryStore.getState().getSquadCategory('squad-1')).toBe('cat-a');
    expect(useCategoryStore.getState().getSquadCategory('nonexistent')).toBeNull();
  });

  it('should reset to defaults', () => {
    useCategoryStore.getState().deleteCategory('cat-a');
    useCategoryStore.getState().deleteCategory('cat-b');
    useCategoryStore.getState().deleteCategory('cat-c');
    expect(useCategoryStore.getState().categories).toHaveLength(0);

    useCategoryStore.getState().resetToDefaults();
    const { categories } = useCategoryStore.getState();
    expect(categories.length).toBeGreaterThan(0);
    // Check that the first default category has the expected structure
    expect(categories[0]).toHaveProperty('id');
    expect(categories[0]).toHaveProperty('squads');
  });
});
