import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

vi.mock('../../hooks/useSound', () => ({
  playSound: vi.fn(),
}));

import { playSound } from '../../hooks/useSound';

const defaults = {
  sidebarCollapsed: false,
  activityPanelOpen: true,
  workflowViewOpen: false,
  agentExplorerOpen: false,
  mobileMenuOpen: false,
  commandPaletteOpen: false,
  currentView: 'chat' as const,
  settingsSection: 'dashboard' as const,
  selectedSquadId: null,
  selectedAgentId: null,
  selectedRoomId: null,
  worldZoom: 'map' as const,
  focusMode: false,
  registryTargetAgentId: null,
  registryTargetWorkflowId: null,
};

describe('uiStore — expanded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState(defaults);
  });

  // --- setSidebarCollapsed ---
  it('should set sidebar collapsed explicitly', () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);

    useUIStore.getState().setSidebarCollapsed(false);
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  // --- setActivityPanelOpen ---
  it('should set activity panel open explicitly', () => {
    useUIStore.getState().setActivityPanelOpen(false);
    expect(useUIStore.getState().activityPanelOpen).toBe(false);

    useUIStore.getState().setActivityPanelOpen(true);
    expect(useUIStore.getState().activityPanelOpen).toBe(true);
  });

  // --- Theme ---
  it('should set theme', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('should cycle themes with toggleTheme: light → dark', () => {
    useUIStore.setState({ theme: 'light' });
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('should cycle themes: dark → glass', () => {
    useUIStore.setState({ theme: 'dark' });
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('glass');
  });

  it('should cycle themes: glass → matrix', () => {
    useUIStore.setState({ theme: 'glass' });
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('matrix');
  });

  it('should cycle themes: matrix → aiox', () => {
    useUIStore.setState({ theme: 'matrix' });
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('aiox');
  });

  it('should cycle themes: aiox → light', () => {
    useUIStore.setState({ theme: 'aiox' });
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
  });

  // --- Workflow view ---
  it('should set workflow view open', () => {
    useUIStore.getState().setWorkflowViewOpen(true);
    expect(useUIStore.getState().workflowViewOpen).toBe(true);
  });

  it('should toggle workflow view', () => {
    useUIStore.getState().toggleWorkflowView();
    expect(useUIStore.getState().workflowViewOpen).toBe(true);
    useUIStore.getState().toggleWorkflowView();
    expect(useUIStore.getState().workflowViewOpen).toBe(false);
  });

  // --- Agent explorer ---
  it('should set agent explorer open with sound', () => {
    useUIStore.getState().setAgentExplorerOpen(true);
    expect(useUIStore.getState().agentExplorerOpen).toBe(true);
    expect(playSound).toHaveBeenCalledWith('open');

    vi.mocked(playSound).mockClear();
    useUIStore.getState().setAgentExplorerOpen(false);
    expect(useUIStore.getState().agentExplorerOpen).toBe(false);
    expect(playSound).toHaveBeenCalledWith('close');
  });

  it('should toggle agent explorer with sound', () => {
    useUIStore.getState().toggleAgentExplorer();
    expect(useUIStore.getState().agentExplorerOpen).toBe(true);
    expect(playSound).toHaveBeenCalledWith('open');

    vi.mocked(playSound).mockClear();
    useUIStore.getState().toggleAgentExplorer();
    expect(useUIStore.getState().agentExplorerOpen).toBe(false);
    expect(playSound).toHaveBeenCalledWith('close');
  });

  // --- Mobile menu ---
  it('should set mobile menu open', () => {
    useUIStore.getState().setMobileMenuOpen(true);
    expect(useUIStore.getState().mobileMenuOpen).toBe(true);
  });

  it('should toggle mobile menu', () => {
    useUIStore.getState().toggleMobileMenu();
    expect(useUIStore.getState().mobileMenuOpen).toBe(true);
    useUIStore.getState().toggleMobileMenu();
    expect(useUIStore.getState().mobileMenuOpen).toBe(false);
  });

  // --- Current view ---
  it('should play navigate sound when changing view', () => {
    useUIStore.getState().setCurrentView('dashboard');
    expect(playSound).toHaveBeenCalledWith('navigate');
  });

  it('should NOT play navigate sound when setting same view', () => {
    useUIStore.setState({ currentView: 'dashboard' });
    vi.mocked(playSound).mockClear();

    useUIStore.getState().setCurrentView('dashboard');
    expect(playSound).not.toHaveBeenCalled();
  });

  // --- Settings section ---
  it('should set settings section', () => {
    useUIStore.getState().setSettingsSection('api');
    expect(useUIStore.getState().settingsSection).toBe('api');
  });

  // --- Room / World ---
  it('should set selected room ID', () => {
    useUIStore.getState().setSelectedRoomId('room-abc');
    expect(useUIStore.getState().selectedRoomId).toBe('room-abc');
  });

  it('should set world zoom', () => {
    useUIStore.getState().setWorldZoom('room');
    expect(useUIStore.getState().worldZoom).toBe('room');
  });

  it('should enter room setting roomId, zoom, and squadId', () => {
    useUIStore.getState().enterRoom('squad-design');
    const s = useUIStore.getState();
    expect(s.selectedRoomId).toBe('squad-design');
    expect(s.worldZoom).toBe('room');
    expect(s.selectedSquadId).toBe('squad-design');
  });

  it('should exit room clearing roomId, zoom, and agentId', () => {
    useUIStore.getState().enterRoom('squad-design');
    useUIStore.getState().setSelectedAgentId('agent-1');

    useUIStore.getState().exitRoom();
    const s = useUIStore.getState();
    expect(s.selectedRoomId).toBeNull();
    expect(s.worldZoom).toBe('map');
    expect(s.selectedAgentId).toBeNull();
  });

  // --- Focus mode ---
  it('should enable focus mode collapsing sidebar and closing activity', () => {
    useUIStore.getState().setFocusMode(true);
    expect(playSound).toHaveBeenCalledWith('open');
    const s = useUIStore.getState();
    expect(s.focusMode).toBe(true);
    expect(s.sidebarCollapsed).toBe(true);
    expect(s.activityPanelOpen).toBe(false);
  });

  it('should disable focus mode with close sound', () => {
    useUIStore.getState().setFocusMode(true);
    vi.mocked(playSound).mockClear();

    useUIStore.getState().setFocusMode(false);
    expect(playSound).toHaveBeenCalledWith('close');
    expect(useUIStore.getState().focusMode).toBe(false);
  });

  it('should toggle focus mode on with effects', () => {
    useUIStore.getState().toggleFocusMode();
    expect(playSound).toHaveBeenCalledWith('open');
    expect(useUIStore.getState().focusMode).toBe(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(useUIStore.getState().activityPanelOpen).toBe(false);
  });

  it('should toggle focus mode off with close sound', () => {
    useUIStore.setState({ focusMode: true });
    vi.mocked(playSound).mockClear();

    useUIStore.getState().toggleFocusMode();
    expect(playSound).toHaveBeenCalledWith('close');
    expect(useUIStore.getState().focusMode).toBe(false);
  });

  // --- Command palette ---
  it('should set command palette open', () => {
    useUIStore.getState().setCommandPaletteOpen(true);
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });

  it('should toggle command palette', () => {
    useUIStore.getState().toggleCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    useUIStore.getState().toggleCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  // --- Registry navigation ---
  it('should navigate to registry agent', () => {
    useUIStore.getState().navigateToRegistryAgent('agent-42');
    expect(playSound).toHaveBeenCalledWith('navigate');
    const s = useUIStore.getState();
    expect(s.currentView).toBe('agent-directory');
    expect(s.registryTargetAgentId).toBe('agent-42');
    expect(s.registryTargetWorkflowId).toBeNull();
  });

  it('should navigate to registry workflow', () => {
    useUIStore.getState().navigateToRegistryWorkflow('wf-99');
    expect(playSound).toHaveBeenCalledWith('navigate');
    const s = useUIStore.getState();
    expect(s.currentView).toBe('workflow-catalog');
    expect(s.registryTargetWorkflowId).toBe('wf-99');
    expect(s.registryTargetAgentId).toBeNull();
  });

  it('should clear registry targets', () => {
    useUIStore.getState().navigateToRegistryAgent('agent-1');
    useUIStore.getState().clearRegistryTarget();

    expect(useUIStore.getState().registryTargetAgentId).toBeNull();
    expect(useUIStore.getState().registryTargetWorkflowId).toBeNull();
  });

  it('should clear previous target when navigating to new type', () => {
    useUIStore.getState().navigateToRegistryAgent('agent-1');
    useUIStore.getState().navigateToRegistryWorkflow('wf-1');

    expect(useUIStore.getState().registryTargetAgentId).toBeNull();
    expect(useUIStore.getState().registryTargetWorkflowId).toBe('wf-1');
  });

  // --- setSelectedSquadId clears agent ---
  it('should clear selectedAgentId when changing squad', () => {
    useUIStore.getState().setSelectedAgentId('agent-1');
    expect(useUIStore.getState().selectedAgentId).toBe('agent-1');

    useUIStore.getState().setSelectedSquadId('new-squad');
    expect(useUIStore.getState().selectedSquadId).toBe('new-squad');
    expect(useUIStore.getState().selectedAgentId).toBeNull();
  });

  // --- setSelectedAgentId ---
  it('should set selected agent ID', () => {
    useUIStore.getState().setSelectedAgentId('agent-x');
    expect(useUIStore.getState().selectedAgentId).toBe('agent-x');
  });
});
