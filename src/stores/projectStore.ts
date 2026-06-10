import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safePersistStorage } from '../lib/safeStorage';

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string;
  addProject: (name: string, path: string) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  reorderProjects: (from: number, to: number) => void;
}

const defaultProject: Project = {
  id: 'default',
  name: 'aios-core',
  path: '/aios-core-meta-gpt',
  createdAt: new Date().toISOString(),
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [defaultProject],
      activeProjectId: 'default',

      addProject: (name, path) => {
        const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newProject: Project = {
          id,
          name,
          path,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          activeProjectId: id,
        }));
      },

      removeProject: (id) => {
        const { projects, activeProjectId } = get();
        // Prevent removing the last project
        if (projects.length <= 1) return;

        const filtered = projects.filter((p) => p.id !== id);
        const newActive =
          activeProjectId === id
            ? filtered[filtered.length - 1].id
            : activeProjectId;

        set({
          projects: filtered,
          activeProjectId: newActive,
        });
      },

      setActiveProject: (id) => {
        set({ activeProjectId: id });
      },

      reorderProjects: (from, to) => {
        set((state) => {
          const updated = [...state.projects];
          const [moved] = updated.splice(from, 1);
          updated.splice(to, 0, moved);
          return { projects: updated };
        });
      },
    }),
    {
      name: 'aios-projects',
      storage: safePersistStorage,
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);
