/**
 * Storybook API Mock Layer
 *
 * Intercepts all /api/* fetch requests and returns realistic mock data
 * so components render with real-looking content instead of loading/error states.
 * No external dependencies required.
 */

// ── Mock Data ────────────────────────────────────────────────

const SQUADS = [
  { id: 'copy-squad', name: 'Copy Squad', description: 'Copywriting and persuasion specialists', domain: 'copywriting', icon: '✍️', agentCount: 5, type: 'copywriting' as const, status: 'active' as const },
  { id: 'sales-squad', name: 'Sales Squad', description: 'Sales funnel and conversion experts', domain: 'sales', icon: '💰', agentCount: 4, type: 'copywriting' as const, status: 'active' as const },
  { id: 'design-squad', name: 'Design Squad', description: 'Visual design and UI/UX team', domain: 'design', icon: '🎨', agentCount: 6, type: 'design' as const, status: 'active' as const },
  { id: 'creative-studio', name: 'Creative Studio', description: 'Brand and creative direction', domain: 'design', icon: '🖌️', agentCount: 3, type: 'design' as const, status: 'busy' as const },
  { id: 'content-ecosystem', name: 'Content Ecosystem', description: 'Content creation pipeline', domain: 'content', icon: '📝', agentCount: 7, type: 'creator' as const, status: 'active' as const },
  { id: 'full-stack-dev', name: 'Full Stack Dev', description: 'Engineering and development', domain: 'engineering', icon: '⚡', agentCount: 5, type: 'creator' as const, status: 'active' as const },
  { id: 'orchestration-hub', name: 'Orchestration Hub', description: 'Workflow orchestration and ops', domain: 'orchestration', icon: '🔄', agentCount: 4, type: 'orchestrator' as const, status: 'active' as const },
  { id: 'analytics-squad', name: 'Analytics Squad', description: 'Data analysis and insights', domain: 'analytics', icon: '📊', agentCount: 3, type: 'orchestrator' as const, status: 'active' as const },
];

const AGENTS = [
  { id: 'dex', name: 'Dex', title: 'Senior Developer', icon: '⚡', tier: 2 as const, squad: 'full-stack-dev', description: 'Full-stack development specialist', commandCount: 12 },
  { id: 'aria', name: 'Aria', title: 'System Architect', icon: '🏗️', tier: 1 as const, squad: 'full-stack-dev', description: 'System architecture and design patterns', commandCount: 8 },
  { id: 'copy-chief', name: 'Copy Chief', title: 'Copy Director', icon: '✍️', tier: 0 as const, squad: 'copy-squad', description: 'Persuasion and copywriting orchestrator', commandCount: 15 },
  { id: 'brad-frost', name: 'Brad Frost', title: 'Design System Architect', icon: '🎨', tier: 2 as const, squad: 'design-squad', description: 'Atomic design and pattern consolidation', commandCount: 36 },
  { id: 'dan-mall', name: 'Dan Mall', title: 'Design Director', icon: '🖌️', tier: 1 as const, squad: 'design-squad', description: 'Design direction and stakeholder alignment', commandCount: 10 },
  { id: 'morgan', name: 'Morgan', title: 'Product Manager', icon: '📋', tier: 1 as const, squad: 'orchestration-hub', description: 'Epic orchestration and requirements', commandCount: 8 },
  { id: 'river', name: 'River', title: 'Scrum Master', icon: '🌊', tier: 2 as const, squad: 'orchestration-hub', description: 'Story creation and sprint management', commandCount: 6 },
  { id: 'aios-master', name: 'AIOS Master', title: 'Master Orchestrator', icon: '🧠', tier: 0 as const, squad: 'orchestration-hub', description: 'System-wide orchestration and governance', commandCount: 20 },
  { id: 'data-analyst', name: 'Data Analyst', title: 'Analytics Specialist', icon: '📊', tier: 2 as const, squad: 'analytics-squad', description: 'Data analysis and reporting', commandCount: 7 },
  { id: 'content-lead', name: 'Content Lead', title: 'Content Strategist', icon: '📝', tier: 1 as const, squad: 'content-ecosystem', description: 'Content strategy and pipeline management', commandCount: 11 },
];

const now = new Date().toISOString();

// ── Route Handlers ───────────────────────────────────────────

type MockHandler = (url: URL) => unknown;

const routes: Array<{ pattern: RegExp; handler: MockHandler }> = [
  // Squads
  {
    pattern: /^\/api\/squads\/ecosystem\/overview$/,
    handler: () => ({
      totalSquads: SQUADS.length,
      totalAgents: SQUADS.reduce((s, q) => s + q.agentCount, 0),
      squads: SQUADS.map((s) => ({
        id: s.id, name: s.name, icon: s.icon, domain: s.domain, agentCount: s.agentCount,
        tiers: { orchestrators: 1, masters: 1, specialists: s.agentCount - 2 },
      })),
    }),
  },
  {
    pattern: /^\/api\/squads\/([^/]+)\/stats$/,
    handler: (url) => {
      const squadId = url.pathname.split('/')[3];
      return {
        squadId,
        stats: {
          totalAgents: 5, byTier: { '0': 1, '1': 1, '2': 3 },
          quality: { withVoiceDna: 4, withAntiPatterns: 3, withIntegration: 5 },
          commands: { total: 42, byAgent: [{ agentId: 'dex', count: 12 }] },
          qualityScore: 87,
        },
      };
    },
  },
  {
    pattern: /^\/api\/squads\/([^/]+)$/,
    handler: (url) => {
      const squadId = url.pathname.split('/')[3];
      const squad = SQUADS.find((s) => s.id === squadId) || SQUADS[0];
      return {
        squad: {
          ...squad,
          agents: AGENTS.filter((a) => a.squad === squad.id),
        },
      };
    },
  },
  {
    pattern: /^\/api\/squads$/,
    handler: () => ({ squads: SQUADS, total: SQUADS.length }),
  },

  // Agents
  {
    pattern: /^\/api\/agents\/search$/,
    handler: (url) => {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const results = AGENTS.filter((a) => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
      return { results, query: q, total: results.length };
    },
  },
  {
    pattern: /^\/api\/agents\/squad\/([^/]+)$/,
    handler: (url) => {
      const squadId = url.pathname.split('/')[4];
      const agents = AGENTS.filter((a) => a.squad === squadId);
      return { squad: squadId, agents, total: agents.length };
    },
  },
  {
    pattern: /^\/api\/agents\/([^/]+)\/([^/]+)\/commands$/,
    handler: (url) => {
      const agentId = url.pathname.split('/')[4];
      return {
        agentId,
        commands: [
          { command: '*help', action: 'help', description: 'Show available commands' },
          { command: '*status', action: 'status', description: 'Show current status' },
          { command: '*task', action: 'task', description: 'Execute a task' },
        ],
      };
    },
  },
  {
    pattern: /^\/api\/agents\/([^/]+)\/([^/]+)$/,
    handler: (url) => {
      const parts = url.pathname.split('/');
      const agentId = parts[4];
      const agent = AGENTS.find((a) => a.id === agentId) || AGENTS[0];
      return {
        agent: {
          ...agent,
          persona: { role: agent.title, style: 'Direct and efficient', identity: agent.description },
          corePrinciples: ['Quality first', 'Clear communication', 'Iterative improvement'],
          commands: [{ command: '*help', action: 'help', description: 'Show commands' }],
          quality: { hasVoiceDna: true, hasAntiPatterns: true, hasIntegration: true },
          status: 'online',
        },
      };
    },
  },
  {
    pattern: /^\/api\/agents$/,
    handler: () => ({ agents: AGENTS, total: AGENTS.length }),
  },

  // Execute
  {
    pattern: /^\/api\/execute\/history$/,
    handler: () => ({
      executions: [
        { id: 'exec-1', agentId: 'dex', agentName: 'Dex', squadId: 'full-stack-dev', status: 'completed', input: 'Build login component', duration: 3200, createdAt: now },
        { id: 'exec-2', agentId: 'copy-chief', agentName: 'Copy Chief', squadId: 'copy-squad', status: 'completed', input: 'Write landing page copy', duration: 5100, createdAt: now },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    }),
  },
  {
    pattern: /^\/api\/execute\/stats$/,
    handler: () => ({
      total: 847, successful: 812, failed: 35, successRate: 95.9,
      averageDuration: 4200, byAgent: {}, bySquad: {},
    }),
  },
  {
    pattern: /^\/api\/execute\/llm\/health$/,
    handler: () => ({
      claude: { available: true },
      openai: { available: true },
    }),
  },
  {
    pattern: /^\/api\/execute\/llm\/usage$/,
    handler: () => ({
      claude: { input: 320_000, output: 510_000, requests: 1240 },
      openai: { input: 160_000, output: 260_000, requests: 680 },
      total: { input: 480_000, output: 770_000, requests: 1920 },
    }),
  },
  {
    pattern: /^\/api\/execute\/llm\/models$/,
    handler: () => ({
      models: [
        { id: 'claude-sonnet-4-20250514', provider: 'anthropic', name: 'Claude Sonnet 4', available: true },
        { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', name: 'Claude Haiku 4.5', available: true },
      ],
    }),
  },

  // Analytics
  {
    pattern: /^\/api\/analytics\/overview$/,
    handler: () => ({
      period: 'day', periodStart: now, periodEnd: now, generatedAt: now,
      summary: {
        totalExecutions: 847, successfulExecutions: 812, failedExecutions: 35, successRate: 95.9,
        averageDuration: 4200, totalRequests: 1230, errorRate: 2.8, avgLatency: 180, p95Latency: 450,
        totalCost: 18.75, totalTokens: 1_250_000, avgCostPerExecution: 0.022,
        activeJobs: 3, scheduledTasks: 12, activeTasks: 5,
      },
      trends: {
        executions: { direction: 'up', change: 12.5 },
        costs: { direction: 'down', change: -3.2 },
        errors: { direction: 'down', change: -8.1 },
      },
      topAgents: [
        { agentId: 'dex', name: 'Dex', executions: 234, successRate: 98.2 },
        { agentId: 'copy-chief', name: 'Copy Chief', executions: 187, successRate: 96.1 },
      ],
      topSquads: [
        { squadId: 'full-stack-dev', name: 'Full Stack Dev', executions: 312, cost: 5.20 },
        { squadId: 'copy-squad', name: 'Copy Squad', executions: 245, cost: 4.10 },
      ],
      health: {
        status: 'healthy', uptime: 99.97,
        memoryUsage: { rss: 180_000_000, heapTotal: 120_000_000, heapUsed: 85_000_000, external: 2_000_000, arrayBuffers: 1_000_000 },
      },
    }),
  },
  {
    pattern: /^\/api\/analytics\/realtime$/,
    handler: () => ({
      timestamp: now, requestsPerMinute: 42, errorsPerMinute: 1.2,
      executionsPerMinute: 8.5, activeExecutions: 3, avgLatencyMs: 180,
    }),
  },
  {
    pattern: /^\/api\/analytics\/costs$/,
    handler: () => ({
      period: 'month', periodStart: now, generatedAt: now,
      summary: { totalCost: 187.50, totalTokens: 12_500_000, totalRecords: 8470, avgCostPerRecord: 0.022, avgTokensPerRecord: 1476 },
      byProvider: [{ provider: 'anthropic', cost: 187.50, tokens: 12_500_000, percentage: 100 }],
      byModel: [{ model: 'claude-sonnet-4', cost: 152.30, tokens: 10_150_000, percentage: 81.2 }],
      timeline: [{ date: now.slice(0, 10), cost: 18.75, tokens: 1_250_000 }],
    }),
  },
  {
    pattern: /^\/api\/analytics\/health-dashboard$/,
    handler: () => ({
      timestamp: now, status: 'healthy', availability: 99.97,
      performance: { requestsLastHour: 2520, errorsLastHour: 72, avgLatencyMs: 180, p95LatencyMs: 450, executionsLastHour: 510, executionSuccessRate: 95.9 },
      resources: { memoryUsedMB: 85, memoryTotalMB: 512, memoryPercentage: 16.6, uptimeSeconds: 864000, uptimeFormatted: '10d 0h' },
      services: { queue: { status: 'healthy', pending: 2, processing: 1 }, scheduler: { status: 'healthy', activeTasks: 5, totalTasks: 12 } },
    }),
  },
  {
    pattern: /^\/api\/analytics\/performance\/agents$/,
    handler: () => ({
      agents: AGENTS.slice(0, 5).map((a) => ({
        agentId: a.id, agentName: a.name, squad: a.squad,
        totalExecutions: 120 + Math.floor(Math.random() * 200), successfulExecutions: 110, failedExecutions: 5,
        successRate: 95 + Math.random() * 5, avgDuration: 3000 + Math.random() * 3000, avgTokens: 1200, totalCost: 2.50, lastActive: now,
      })),
    }),
  },
  {
    pattern: /^\/api\/analytics\/performance\/squads$/,
    handler: () => ({
      squads: SQUADS.slice(0, 4).map((s) => ({
        squadId: s.id, squadName: s.name, agentCount: s.agentCount,
        totalExecutions: 200, successRate: 96.5, avgDuration: 4100, totalCost: 5.20,
        topAgents: [{ agentId: 'dex', executions: 80 }],
      })),
    }),
  },
  {
    pattern: /^\/api\/analytics\/usage\/tokens$/,
    handler: () => ({
      total: { input: 480_000, output: 770_000 },
      byGroup: [
        { name: 'anthropic', input: 480_000, output: 770_000 },
      ],
    }),
  },

  // Workflows
  {
    pattern: /^\/api\/workflows\/executions$/,
    handler: () => ({ executions: [], total: 0 }),
  },
  {
    pattern: /^\/api\/workflows$/,
    handler: () => ({ workflows: [], total: 0 }),
  },

  // Stories (kanban) — useStories() queryFn returns res.json() expecting Story[]
  {
    pattern: /^\/api\/stories$/,
    handler: () => [],
  },

  // MCP / Tools — useMCPStatus() reads data.servers, each server needs tools: [{name,calls}]
  {
    pattern: /^\/api\/tools\/mcp$/,
    handler: () => ({
      servers: [
        {
          name: 'playwright', status: 'connected', type: 'builtin',
          tools: [
            { name: 'navigate', calls: 45 },
            { name: 'screenshot', calls: 23 },
            { name: 'click', calls: 67 },
          ],
          toolCount: 3, resources: [], lastPing: now,
        },
        {
          name: 'context7', status: 'connected', type: 'docker',
          tools: [
            { name: 'resolve-library-id', calls: 34 },
            { name: 'get-library-docs', calls: 89 },
          ],
          toolCount: 2, resources: [], lastPing: now,
        },
      ],
      totalServers: 2,
      totalTools: 5,
    }),
  },
];

// ── Fetch Interceptor ────────────────────────────────────────

const originalFetch = window.fetch.bind(window);

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string'
    ? new URL(input, window.location.origin)
    : input instanceof URL
      ? input
      : new URL(input.url, window.location.origin);

  const pathname = url.pathname;

  // Only intercept /api/* requests
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/api')) {
    return originalFetch(input, init);
  }

  // Find matching route
  for (const route of routes) {
    if (route.pattern.test(pathname)) {
      const data = route.handler(url);
      return Promise.resolve(
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
  }

  // Catch-all for unmatched /api/* endpoints — return empty success
  return Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

/** Call once in preview.tsx to activate API mocking */
export function installApiMocks() {
  window.fetch = mockFetch as typeof window.fetch;
}
