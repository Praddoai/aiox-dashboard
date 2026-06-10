import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/safeStorage', () => ({
  safePersistStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
}));

import { useProjectStore } from '../projectStore';

const _defaultProject = {
  id: 'default',
  name: 'aios-core',
  path: '/aios-core-meta-gpt',
  createdAt: expect.any(String),
};

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [
        {
          id: 'default',
          name: 'aios-core',
          path: '/aios-core-meta-gpt',
          createdAt: new Date().toISOString(),
        },
      ],
      activeProjectId: 'default',
    });
  });

  it('should have one default project initially', () => {
    const state = useProjectStore.getState();
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0]).toMatchObject({
      id: 'default',
      name: 'aios-core',
      path: '/aios-core-meta-gpt',
    });
  });

  it('should have activeProjectId set to default', () => {
    expect(useProjectStore.getState().activeProjectId).toBe('default');
  });

  it('should add a new project and set it as active', () => {
    useProjectStore.getState().addProject('My App', '/projects/my-app');
    const state = useProjectStore.getState();

    expect(state.projects).toHaveLength(2);
    const newProject = state.projects[1];
    expect(newProject.name).toBe('My App');
    expect(newProject.path).toBe('/projects/my-app');
    expect(newProject.id).toMatch(/^proj-/);
    expect(newProject.createdAt).toBeDefined();
    expect(state.activeProjectId).toBe(newProject.id);
  });

  it('should remove a project', () => {
    useProjectStore.getState().addProject('Second', '/second');
    const secondId = useProjectStore.getState().projects[1].id;

    useProjectStore.getState().removeProject(secondId);
    expect(useProjectStore.getState().projects).toHaveLength(1);
    expect(useProjectStore.getState().projects[0].id).toBe('default');
  });

  it('should not remove the last project', () => {
    useProjectStore.getState().removeProject('default');
    expect(useProjectStore.getState().projects).toHaveLength(1);
    expect(useProjectStore.getState().projects[0].id).toBe('default');
  });

  it('should update activeProjectId when removing the active project', () => {
    useProjectStore.getState().addProject('Second', '/second');
    const secondId = useProjectStore.getState().projects[1].id;

    // secondId is active after addProject
    expect(useProjectStore.getState().activeProjectId).toBe(secondId);

    useProjectStore.getState().removeProject(secondId);
    expect(useProjectStore.getState().activeProjectId).toBe('default');
  });

  it('should not change activeProjectId when removing a non-active project', () => {
    useProjectStore.getState().addProject('Second', '/second');
    // Active is now the second project
    useProjectStore.getState().setActiveProject('default');

    const secondId = useProjectStore.getState().projects[1].id;
    useProjectStore.getState().removeProject(secondId);
    expect(useProjectStore.getState().activeProjectId).toBe('default');
  });

  it('should set active project', () => {
    useProjectStore.getState().addProject('Second', '/second');
    useProjectStore.getState().setActiveProject('default');
    expect(useProjectStore.getState().activeProjectId).toBe('default');
  });

  it('should reorder projects', () => {
    useProjectStore.getState().addProject('Second', '/second');
    useProjectStore.getState().addProject('Third', '/third');

    // Move first (index 0) to last (index 2)
    useProjectStore.getState().reorderProjects(0, 2);
    const names = useProjectStore.getState().projects.map((p) => p.name);
    expect(names[0]).toBe('Second');
    expect(names[1]).toBe('Third');
    expect(names[2]).toBe('aios-core');
  });
});
