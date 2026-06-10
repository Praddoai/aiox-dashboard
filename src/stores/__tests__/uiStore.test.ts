import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

vi.mock('../../hooks/useSound', () => ({
  playSound: vi.fn(),
}));

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      activityPanelOpen: true,
      currentView: 'chat',
      focusMode: false,
      agentExplorerOpen: false,
      workflowViewOpen: false,
      mobileMenuOpen: false,
      selectedSquadId: null,
      selectedAgentId: null,
    });
  });

  it('should toggle sidebar', () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('should set current view', () => {
    useUIStore.getState().setCurrentView('dashboard');
    expect(useUIStore.getState().currentView).toBe('dashboard');
  });

  it('should toggle activity panel', () => {
    expect(useUIStore.getState().activityPanelOpen).toBe(true);
    useUIStore.getState().toggleActivityPanel();
    expect(useUIStore.getState().activityPanelOpen).toBe(false);
  });

  it('should enable focus mode and collapse sidebar + close activity', () => {
    useUIStore.getState().setFocusMode(true);
    const state = useUIStore.getState();
    expect(state.focusMode).toBe(true);
    expect(state.sidebarCollapsed).toBe(true);
    expect(state.activityPanelOpen).toBe(false);
  });

  it('should disable focus mode', () => {
    useUIStore.getState().setFocusMode(true);
    useUIStore.getState().setFocusMode(false);
    expect(useUIStore.getState().focusMode).toBe(false);
  });

  it('should toggle focus mode', () => {
    useUIStore.getState().toggleFocusMode();
    expect(useUIStore.getState().focusMode).toBe(true);
    useUIStore.getState().toggleFocusMode();
    expect(useUIStore.getState().focusMode).toBe(false);
  });

  it('should set selected squad and clear agent', () => {
    useUIStore.getState().setSelectedAgentId('agent-1');
    useUIStore.getState().setSelectedSquadId('squad-1');
    expect(useUIStore.getState().selectedSquadId).toBe('squad-1');
    expect(useUIStore.getState().selectedAgentId).toBeNull();
  });

  it('should enter and exit room', () => {
    useUIStore.getState().enterRoom('room-1');
    const state = useUIStore.getState();
    expect(state.selectedRoomId).toBe('room-1');
    expect(state.worldZoom).toBe('room');

    useUIStore.getState().exitRoom();
    const after = useUIStore.getState();
    expect(after.selectedRoomId).toBeNull();
    expect(after.worldZoom).toBe('map');
  });
});
