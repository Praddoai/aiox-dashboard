import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeType = 'light' | 'dark' | 'system' | 'matrix' | 'glass' | 'aiox';

type ViewType =
  | 'chat' | 'dashboard' | 'settings' | 'orchestrator' | 'world'
  | 'kanban' | 'agents' | 'bob' | 'terminals' | 'monitor'
  | 'insights' | 'context' | 'roadmap' | 'squads' | 'github' | 'qa';
export type SettingsSection = 'dashboard' | 'categories' | 'memory' | 'workflows' | 'profile' | 'api' | 'appearance' | 'notifications' | 'privacy' | 'about';

interface PlatformUIState {
  sidebarCollapsed: boolean;
  activityPanelOpen: boolean;
  workflowViewOpen: boolean;
  agentExplorerOpen: boolean;
  mobileMenuOpen: boolean;
  theme: ThemeType;
  selectedSquadId: string | null;
  selectedAgentId: string | null;
  currentView: ViewType;
  settingsSection: SettingsSection;
  selectedRoomId: string | null;
  worldZoom: 'map' | 'room';
}

interface UIActions {
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setActivityPanelOpen: (open: boolean) => void;
  toggleActivityPanel: () => void;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  setSelectedSquadId: (squadId: string | null) => void;
  setSelectedAgentId: (agentId: string | null) => void;
  setWorkflowViewOpen: (open: boolean) => void;
  toggleWorkflowView: () => void;
  setAgentExplorerOpen: (open: boolean) => void;
  toggleAgentExplorer: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setCurrentView: (view: ViewType) => void;
  setSettingsSection: (section: SettingsSection) => void;
  setSelectedRoomId: (roomId: string | null) => void;
  setWorldZoom: (zoom: 'map' | 'room') => void;
  enterRoom: (roomId: string) => void;
  exitRoom: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: ThemeType) => {
  const html = document.documentElement;

  // Clean up all theme states
  html.classList.remove('dark');
  html.removeAttribute('data-theme');

  if (theme === 'matrix') {
    html.classList.add('dark');
    html.setAttribute('data-theme', 'matrix');
  } else if (theme === 'glass') {
    html.classList.add('dark');
    html.setAttribute('data-theme', 'glass');
  } else if (theme === 'aiox') {
    html.classList.add('dark');
    html.setAttribute('data-theme', 'aiox');
  } else {
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    if (effectiveTheme === 'dark') {
      html.classList.add('dark');
    }
  }
};

export const useUIStore = create<PlatformUIState & UIActions>()(
  persist(
    (set, get) => ({
      // State
      sidebarCollapsed: false,
      activityPanelOpen: true,
      workflowViewOpen: false,
      agentExplorerOpen: false,
      mobileMenuOpen: false,
      theme: 'system' as ThemeType,
      selectedSquadId: null,
      selectedAgentId: null,
      currentView: 'chat' as ViewType,
      settingsSection: 'dashboard' as SettingsSection,
      selectedRoomId: null,
      worldZoom: 'map' as const,

      // Actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setActivityPanelOpen: (open) => set({ activityPanelOpen: open }),
      toggleActivityPanel: () => set((state) => ({ activityPanelOpen: !state.activityPanelOpen })),

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        let newTheme: ThemeType;
        if (currentTheme === 'aiox') {
          newTheme = 'light';
        } else if (currentTheme === 'matrix') {
          newTheme = 'aiox';
        } else if (currentTheme === 'glass') {
          newTheme = 'matrix';
        } else {
          const effectiveTheme = currentTheme === 'system' ? getSystemTheme() : currentTheme;
          newTheme = effectiveTheme === 'dark' ? 'glass' : 'dark';
        }
        applyTheme(newTheme);
        set({ theme: newTheme });
      },

      setSelectedSquadId: (squadId) => set({ selectedSquadId: squadId, selectedAgentId: null }),
      setSelectedAgentId: (agentId) => set({ selectedAgentId: agentId }),
      setWorkflowViewOpen: (open) => set({ workflowViewOpen: open }),
      toggleWorkflowView: () => set((state) => ({ workflowViewOpen: !state.workflowViewOpen })),
      setAgentExplorerOpen: (open) => set({ agentExplorerOpen: open }),
      toggleAgentExplorer: () => set((state) => ({ agentExplorerOpen: !state.agentExplorerOpen })),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
      setCurrentView: (view) => set({ currentView: view }),
      setSettingsSection: (section) => set({ settingsSection: section }),
      setSelectedRoomId: (roomId) => set({ selectedRoomId: roomId }),
      setWorldZoom: (zoom) => set({ worldZoom: zoom }),
      enterRoom: (roomId) => set({ selectedRoomId: roomId, worldZoom: 'room', selectedSquadId: roomId }),
      exitRoom: () => set({ selectedRoomId: null, worldZoom: 'map', selectedAgentId: null }),
    }),
    {
      name: 'aios-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activityPanelOpen: state.activityPanelOpen,
        theme: state.theme,
        currentView: state.currentView,
        settingsSection: state.settingsSection,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useUIStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}
