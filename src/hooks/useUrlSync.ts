import { useEffect, useRef } from 'react';
import { useUIStore } from '../stores/uiStore';

// Bidirectional sync between URL and uiStore.currentView
// Supports: /dashboard, /kanban, /world, /world/room/dev-squad, /agents, /settings/appearance,
//           /chat/squad/{squadId}, /chat/squad/{squadId}/{agentId}, etc.

// Use the local ViewType from uiStore (includes 'knowledge')
type ViewType = string;

const VIEW_PATHS: Record<string, string> = {
  // Canonical paths (must come first — "first wins" in PATH_FOR_VIEW reverse map)
  '/': 'chat',
  '/chat': 'chat',
  '/dashboard': 'dashboard',
  '/agents': 'agents',
  '/bob': 'bob',
  '/terminals': 'terminals',
  '/monitor': 'monitor',
  '/context': 'context',
  '/knowledge': 'knowledge',
  '/roadmap': 'roadmap',
  '/squads': 'squads',
  '/stories': 'stories',
  '/github': 'github',
  '/qa': 'qa',
  '/settings': 'settings',
  '/orchestrator': 'orchestrator',
  '/world': 'world',
  '/sales-room': 'sales-room',
  '/engine': 'engine',
  '/agent-directory': 'agent-directory',
  '/task-catalog': 'task-catalog',
  '/workflow-catalog': 'workflow-catalog',
  '/authority-matrix': 'authority-matrix',
  '/handoff-flows': 'handoff-flows',
  // Consolidated aliases (redirect to canonical view)
  '/cockpit': 'dashboard',
  '/insights': 'dashboard',
  '/kanban': 'stories',
  '/timeline': 'monitor',
};

// Reverse map: viewType -> path
const PATH_FOR_VIEW: Record<string, string> = {};
for (const [path, view] of Object.entries(VIEW_PATHS)) {
  if (path !== '/' && !PATH_FOR_VIEW[view]) {
    PATH_FOR_VIEW[view] = path; // first wins = canonical path
  }
}
PATH_FOR_VIEW['chat'] = '/';
PATH_FOR_VIEW['kanban'] = '/stories'; // backward compat: kanban consolidated into stories
PATH_FOR_VIEW['timeline'] = '/monitor'; // backward compat: timeline consolidated into monitor
PATH_FOR_VIEW['cockpit'] = '/dashboard'; // backward compat: cockpit consolidated into dashboard
PATH_FOR_VIEW['insights'] = '/dashboard'; // backward compat: insights consolidated into dashboard

interface ParsedUrl {
  view: string;
  roomId?: string;
  settingsSection?: string;
  squadId?: string;
  agentId?: string;
  sharedTaskId?: string;
}

function parseUrl(pathname: string): ParsedUrl {
  // /share/{taskId}
  const shareMatch = pathname.match(/^\/share\/([^/]+)/);
  if (shareMatch) {
    return { view: 'share', sharedTaskId: shareMatch[1] };
  }

  // /world/room/{roomId}
  const worldRoomMatch = pathname.match(/^\/world\/room\/([^/]+)/);
  if (worldRoomMatch) {
    return { view: 'world', roomId: worldRoomMatch[1] };
  }

  // /settings/{section}
  const settingsMatch = pathname.match(/^\/settings\/([^/]+)/);
  if (settingsMatch) {
    return { view: 'settings', settingsSection: settingsMatch[1] };
  }

  // /chat/squad/{squadId}/{agentId}
  const chatAgentMatch = pathname.match(/^\/chat\/squad\/([^/]+)\/([^/]+)/);
  if (chatAgentMatch) {
    return { view: 'chat', squadId: chatAgentMatch[1], agentId: chatAgentMatch[2] };
  }

  // /chat/squad/{squadId}
  const chatSquadMatch = pathname.match(/^\/chat\/squad\/([^/]+)/);
  if (chatSquadMatch) {
    return { view: 'chat', squadId: chatSquadMatch[1] };
  }

  // Direct view match
  const view = VIEW_PATHS[pathname];
  if (view) return { view };

  // Default to chat
  return { view: 'chat' };
}

interface BuildUrlState {
  currentView: ViewType;
  selectedRoomId?: string | null;
  settingsSection?: string;
  worldZoom?: string;
  selectedSquadId?: string | null;
  selectedAgentId?: string | null;
  sharedTaskId?: string | null;
}

function buildUrl(state: BuildUrlState): string {
  if (state.currentView === 'share' && state.sharedTaskId) {
    return `/share/${state.sharedTaskId}`;
  }

  if (state.currentView === 'world' && state.worldZoom === 'room' && state.selectedRoomId) {
    return `/world/room/${state.selectedRoomId}`;
  }

  if (state.currentView === 'settings' && state.settingsSection && state.settingsSection !== 'dashboard') {
    return `/settings/${state.settingsSection}`;
  }

  // Chat sub-routes for squad/agent selection
  if (state.currentView === 'chat' && state.selectedSquadId) {
    if (state.selectedAgentId) {
      return `/chat/squad/${state.selectedSquadId}/${state.selectedAgentId}`;
    }
    return `/chat/squad/${state.selectedSquadId}`;
  }

  return PATH_FOR_VIEW[state.currentView] || '/';
}

export function useUrlSync() {
  const isNavigating = useRef(false);

  // 1. On mount: URL is source of truth — sync store to URL, set initial history state
  useEffect(() => {
    isNavigating.current = true;
    const { view, roomId, settingsSection, squadId, agentId, sharedTaskId } = parseUrl(window.location.pathname);
    const store = useUIStore.getState();

    if (view !== store.currentView) {
      store.setCurrentView(view as never);
    }
    // Store sharedTaskId for the SharedTaskView component to read
    if (sharedTaskId) {
      sessionStorage.setItem('shared-task-id', sharedTaskId);
    }
    if (roomId) {
      store.enterRoom(roomId);
    } else if (view === 'world' && store.worldZoom === 'room') {
      store.exitRoom();
    }
    if (settingsSection) {
      store.setSettingsSection(settingsSection as ReturnType<typeof useUIStore.getState>['settingsSection']);
    }
    // Restore chat squad/agent selection from URL
    if (view === 'chat') {
      if (squadId && squadId !== store.selectedSquadId) {
        store.setSelectedSquadId(squadId);
      }
      if (agentId && agentId !== store.selectedAgentId) {
        store.setSelectedAgentId(agentId);
      }
      if (!squadId && store.selectedSquadId) {
        store.setSelectedSquadId(null);
      }
    }

    // Set initial history state so back/forward works from the first entry
    // Use canonical URL (handles consolidated redirects like /cockpit → /dashboard)
    const canonicalUrl = buildUrl({
      currentView: view,
      selectedRoomId: roomId,
      settingsSection,
      worldZoom: roomId ? 'room' : undefined,
      selectedSquadId: squadId,
      selectedAgentId: agentId,
      sharedTaskId,
    });
    window.history.replaceState({ view }, '', canonicalUrl);

    // Small delay to prevent the initial store → URL push
    setTimeout(() => { isNavigating.current = false; }, 100);
  }, []);

  // 2. Store changes -> push URL (skip if triggered by popstate)
  useEffect(() => {
    const unsub = useUIStore.subscribe((state, prevState) => {
      if (isNavigating.current) return;

      const viewChanged = state.currentView !== prevState.currentView;
      const roomChanged = state.selectedRoomId !== prevState.selectedRoomId;
      const settingsChanged = state.settingsSection !== prevState.settingsSection;
      const zoomChanged = state.worldZoom !== prevState.worldZoom;
      const squadChanged = state.selectedSquadId !== prevState.selectedSquadId;
      const agentChanged = state.selectedAgentId !== prevState.selectedAgentId;

      if (viewChanged || roomChanged || settingsChanged || zoomChanged || squadChanged || agentChanged) {
        const url = buildUrl({
          currentView: state.currentView,
          selectedRoomId: state.selectedRoomId,
          settingsSection: state.settingsSection,
          worldZoom: state.worldZoom,
          selectedSquadId: state.selectedSquadId,
          selectedAgentId: state.selectedAgentId,
        });

        if (url !== window.location.pathname) {
          window.history.pushState({ view: state.currentView }, '', url);
        }
      }
    });

    return unsub;
  }, []);

  // 3. Browser back/forward -> update store
  useEffect(() => {
    const handlePopState = () => {
      isNavigating.current = true;
      const { view, roomId, settingsSection, squadId, agentId, sharedTaskId } = parseUrl(window.location.pathname);
      const store = useUIStore.getState();

      store.setCurrentView(view as never);
      if (sharedTaskId) {
        sessionStorage.setItem('shared-task-id', sharedTaskId);
      }
      if (roomId) {
        store.enterRoom(roomId);
      } else if (view === 'world') {
        store.exitRoom();
      }
      if (settingsSection) {
        store.setSettingsSection(settingsSection as ReturnType<typeof useUIStore.getState>['settingsSection']);
      }
      // Restore chat squad/agent on back/forward
      if (view === 'chat') {
        store.setSelectedSquadId(squadId || null);
        store.setSelectedAgentId(agentId || null);
      }

      setTimeout(() => { isNavigating.current = false; }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}
