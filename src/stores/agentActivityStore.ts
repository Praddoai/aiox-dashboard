import { create } from 'zustand';
import { useMonitorStore, type MonitorEvent } from './monitorStore';

export interface AgentLiveActivity {
  agentName: string;
  action: string;
  type: 'tool_call' | 'message' | 'error' | 'system';
  timestamp: number;
  isActive: boolean;
  tool?: string;
  success?: boolean;
}

interface AgentActivityState {
  activities: Map<string, AgentLiveActivity>;
  getActivity: (agentName: string) => AgentLiveActivity | undefined;
  processEvent: (event: MonitorEvent) => void;
  clearStale: () => void;
}

// Normalize agent name: "@dev (Dex)" -> "dex", "Dev" -> "dev"
function normalizeAgentName(raw: string): string {
  // Extract name from parentheses if present: "@dev (Dex)" -> "Dex"
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1].toLowerCase();
  // Strip @ prefix: "@dev" -> "dev"
  const stripped = raw.replace(/^@/, '');
  return stripped.toLowerCase();
}

// Extract a short action label from event description
function extractActionLabel(event: MonitorEvent): string {
  const desc = event.description;

  // Tool calls: "ToolUse: Read" -> "Reading..."
  if (event.type === 'tool_call') {
    if (desc.includes('Read')) return 'Reading file...';
    if (desc.includes('Edit')) return 'Editing code...';
    if (desc.includes('Write')) return 'Writing file...';
    if (desc.includes('Bash')) return 'Running command...';
    if (desc.includes('Grep')) return 'Searching code...';
    if (desc.includes('Glob')) return 'Finding files...';
    if (desc.includes('Agent')) return 'Spawning agent...';
    if (desc.includes('WebSearch') || desc.includes('WebFetch')) return 'Searching web...';
    // Extract tool name from description
    const toolMatch = desc.match(/(?:ToolUse|tool_call):\s*(\w+)/);
    if (toolMatch) return `Using ${toolMatch[1]}...`;
    return 'Using tool...';
  }

  if (event.type === 'message') return 'Thinking...';
  if (event.type === 'error') return 'Error encountered';

  // Truncate long descriptions
  if (desc.length > 30) return desc.slice(0, 27) + '...';
  return desc || 'Working...';
}

// Extract tool name from description
function extractToolName(desc: string): string | undefined {
  const match = desc.match(/(?:ToolUse|tool_call):\s*(\w+)/);
  return match?.[1];
}

// How long (ms) before an activity is considered stale
const STALE_THRESHOLD = 15_000;

export const useAgentActivityStore = create<AgentActivityState>((set, get) => ({
  activities: new Map(),

  getActivity: (agentName: string) => {
    const normalized = normalizeAgentName(agentName);
    const activities = get().activities;
    // Try exact match first, then fuzzy
    for (const [key, value] of activities) {
      if (key === normalized || key.includes(normalized) || normalized.includes(key)) {
        return value;
      }
    }
    return undefined;
  },

  processEvent: (event: MonitorEvent) => {
    const agentKey = normalizeAgentName(event.agent);
    if (!agentKey || agentKey === 'system') return;

    const activity: AgentLiveActivity = {
      agentName: event.agent,
      action: extractActionLabel(event),
      type: event.type,
      timestamp: Date.now(),
      isActive: true,
      tool: extractToolName(event.description),
      success: event.success,
    };

    set((state) => {
      const next = new Map(state.activities);
      next.set(agentKey, activity);
      return { activities: next };
    });

    // Auto-deactivate after a timeout (agent is done with this action)
    setTimeout(() => {
      const current = get().activities.get(agentKey);
      if (current && current.timestamp === activity.timestamp) {
        set((state) => {
          const next = new Map(state.activities);
          next.set(agentKey, { ...current, isActive: false });
          return { activities: next };
        });
      }
    }, 8000);
  },

  clearStale: () => {
    const now = Date.now();
    set((state) => {
      const next = new Map<string, AgentLiveActivity>();
      state.activities.forEach((activity, key) => {
        if (now - activity.timestamp < STALE_THRESHOLD) {
          next.set(key, activity);
        }
      });
      return { activities: next };
    });
  },
}));

// Subscribe to monitor store events — bridge real-time data
let lastEventCount = 0;
useMonitorStore.subscribe((state) => {
  const events = state.events;
  if (events.length > lastEventCount) {
    // Process only new events
    const newEvents = events.slice(lastEventCount);
    newEvents.forEach((event) => {
      useAgentActivityStore.getState().processEvent(event);
    });
    lastEventCount = events.length;
  } else if (events.length < lastEventCount) {
    // Events were cleared
    lastEventCount = events.length;
  }
});

// Periodic stale cleanup
setInterval(() => {
  useAgentActivityStore.getState().clearStale();
}, 10_000);
