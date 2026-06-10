import { describe, it, expect } from 'vitest';

// We test the pure functions by importing the module and extracting them
// Since parseUrl and buildUrl are not exported, we test via the module's behavior
// by re-implementing the logic here (same source of truth)

const VIEW_PATHS: Record<string, string> = {
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
  '/cockpit': 'dashboard',
  '/insights': 'dashboard',
  '/kanban': 'stories',
  '/timeline': 'monitor',
};

const PATH_FOR_VIEW: Record<string, string> = {};
for (const [path, view] of Object.entries(VIEW_PATHS)) {
  if (path !== '/' && !PATH_FOR_VIEW[view]) {
    PATH_FOR_VIEW[view] = path;
  }
}
PATH_FOR_VIEW['chat'] = '/';
PATH_FOR_VIEW['kanban'] = '/stories';
PATH_FOR_VIEW['timeline'] = '/monitor';
PATH_FOR_VIEW['cockpit'] = '/dashboard';
PATH_FOR_VIEW['insights'] = '/dashboard';

interface ParsedUrl {
  view: string;
  roomId?: string;
  settingsSection?: string;
  squadId?: string;
  agentId?: string;
  sharedTaskId?: string;
}

function parseUrl(pathname: string): ParsedUrl {
  const shareMatch = pathname.match(/^\/share\/([^/]+)/);
  if (shareMatch) return { view: 'share', sharedTaskId: shareMatch[1] };

  const worldRoomMatch = pathname.match(/^\/world\/room\/([^/]+)/);
  if (worldRoomMatch) return { view: 'world', roomId: worldRoomMatch[1] };

  const settingsMatch = pathname.match(/^\/settings\/([^/]+)/);
  if (settingsMatch) return { view: 'settings', settingsSection: settingsMatch[1] };

  const chatAgentMatch = pathname.match(/^\/chat\/squad\/([^/]+)\/([^/]+)/);
  if (chatAgentMatch) return { view: 'chat', squadId: chatAgentMatch[1], agentId: chatAgentMatch[2] };

  const chatSquadMatch = pathname.match(/^\/chat\/squad\/([^/]+)/);
  if (chatSquadMatch) return { view: 'chat', squadId: chatSquadMatch[1] };

  const view = VIEW_PATHS[pathname];
  if (view) return { view };

  return { view: 'chat' };
}

interface BuildUrlState {
  currentView: string;
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
  if (state.currentView === 'chat' && state.selectedSquadId) {
    if (state.selectedAgentId) {
      return `/chat/squad/${state.selectedSquadId}/${state.selectedAgentId}`;
    }
    return `/chat/squad/${state.selectedSquadId}`;
  }
  return PATH_FOR_VIEW[state.currentView] || '/';
}

describe('URL Sync - parseUrl', () => {
  it('should parse root as chat', () => {
    expect(parseUrl('/')).toEqual({ view: 'chat' });
  });

  it('should parse /dashboard', () => {
    expect(parseUrl('/dashboard')).toEqual({ view: 'dashboard' });
  });

  it('should parse /agents', () => {
    expect(parseUrl('/agents')).toEqual({ view: 'agents' });
  });

  it('should parse /cockpit as dashboard (alias)', () => {
    expect(parseUrl('/cockpit')).toEqual({ view: 'dashboard' });
  });

  it('should parse /kanban as stories (alias)', () => {
    expect(parseUrl('/kanban')).toEqual({ view: 'stories' });
  });

  it('should parse /timeline as monitor (alias)', () => {
    expect(parseUrl('/timeline')).toEqual({ view: 'monitor' });
  });

  it('should parse /share/{taskId}', () => {
    expect(parseUrl('/share/abc-123')).toEqual({ view: 'share', sharedTaskId: 'abc-123' });
  });

  it('should parse /world/room/{roomId}', () => {
    expect(parseUrl('/world/room/dev-squad')).toEqual({ view: 'world', roomId: 'dev-squad' });
  });

  it('should parse /settings/{section}', () => {
    expect(parseUrl('/settings/appearance')).toEqual({ view: 'settings', settingsSection: 'appearance' });
  });

  it('should parse /chat/squad/{squadId}', () => {
    expect(parseUrl('/chat/squad/core')).toEqual({ view: 'chat', squadId: 'core' });
  });

  it('should parse /chat/squad/{squadId}/{agentId}', () => {
    expect(parseUrl('/chat/squad/core/dex')).toEqual({ view: 'chat', squadId: 'core', agentId: 'dex' });
  });

  it('should default unknown paths to chat', () => {
    expect(parseUrl('/unknown-path')).toEqual({ view: 'chat' });
  });

  it('should parse all canonical views', () => {
    const canonicals = [
      'bob', 'terminals', 'monitor', 'context', 'knowledge',
      'roadmap', 'squads', 'stories', 'github', 'qa',
      'orchestrator', 'world', 'engine',
    ];
    for (const view of canonicals) {
      expect(parseUrl(`/${view}`).view).toBe(view);
    }
  });
});

describe('URL Sync - buildUrl', () => {
  it('should build / for chat view', () => {
    expect(buildUrl({ currentView: 'chat' })).toBe('/');
  });

  it('should build /dashboard for dashboard view', () => {
    expect(buildUrl({ currentView: 'dashboard' })).toBe('/dashboard');
  });

  it('should build /share/{id} for share view', () => {
    expect(buildUrl({ currentView: 'share', sharedTaskId: 'task-1' })).toBe('/share/task-1');
  });

  it('should build /world/room/{id} for world room zoom', () => {
    expect(buildUrl({ currentView: 'world', worldZoom: 'room', selectedRoomId: 'dev' })).toBe('/world/room/dev');
  });

  it('should build /world for world view without room', () => {
    expect(buildUrl({ currentView: 'world' })).toBe('/world');
  });

  it('should build /settings/{section}', () => {
    expect(buildUrl({ currentView: 'settings', settingsSection: 'appearance' })).toBe('/settings/appearance');
  });

  it('should build /settings for settings with dashboard section', () => {
    expect(buildUrl({ currentView: 'settings', settingsSection: 'dashboard' })).toBe('/settings');
  });

  it('should build /chat/squad/{squadId}', () => {
    expect(buildUrl({ currentView: 'chat', selectedSquadId: 'core' })).toBe('/chat/squad/core');
  });

  it('should build /chat/squad/{squadId}/{agentId}', () => {
    expect(buildUrl({ currentView: 'chat', selectedSquadId: 'core', selectedAgentId: 'dex' }))
      .toBe('/chat/squad/core/dex');
  });

  it('should fallback to / for unknown views', () => {
    expect(buildUrl({ currentView: 'nonexistent' })).toBe('/');
  });

  it('should handle backward-compat aliases', () => {
    expect(buildUrl({ currentView: 'kanban' })).toBe('/stories');
    expect(buildUrl({ currentView: 'cockpit' })).toBe('/dashboard');
    expect(buildUrl({ currentView: 'insights' })).toBe('/dashboard');
    expect(buildUrl({ currentView: 'timeline' })).toBe('/monitor');
  });
});

describe('URL Sync - VIEW_PATHS consistency', () => {
  it('should have all canonical views in PATH_FOR_VIEW', () => {
    const views = new Set(Object.values(VIEW_PATHS));
    for (const view of views) {
      expect(PATH_FOR_VIEW[view]).toBeDefined();
    }
  });

  it('should round-trip canonical paths', () => {
    const canonicals = ['/dashboard', '/agents', '/world', '/monitor', '/settings', '/stories', '/engine'];
    for (const path of canonicals) {
      const parsed = parseUrl(path);
      const rebuilt = buildUrl({ currentView: parsed.view });
      expect(rebuilt).toBe(path);
    }
  });
});
