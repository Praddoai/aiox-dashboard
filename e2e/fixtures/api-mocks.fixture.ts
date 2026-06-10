import { Page, Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// API mock helpers — intercept /api/* calls with deterministic responses
// ---------------------------------------------------------------------------

/** Mock data factories */
export const mockData = {
  squads: [
    {
      id: 'squad-aios-core',
      name: 'AIOS Core',
      type: 'orchestrator' as const,
      description: 'Core orchestration squad',
      agentCount: 12,
      status: 'active',
    },
    {
      id: 'squad-design',
      name: 'Design System',
      type: 'design' as const,
      description: 'Design system squad',
      agentCount: 3,
      status: 'active',
    },
  ],

  agents: [
    {
      id: 'gage',
      name: 'GAGE',
      role: 'DevOps Engineer',
      squadId: 'squad-aios-core',
      tier: 2,
      status: 'online',
      avatar: '/avatars/gage.png',
    },
    {
      id: 'dex',
      name: 'DEX',
      role: 'Developer',
      squadId: 'squad-aios-core',
      tier: 2,
      status: 'online',
      avatar: '/avatars/dex.png',
    },
    {
      id: 'aria',
      name: 'ARIA',
      role: 'Architect',
      squadId: 'squad-aios-core',
      tier: 1,
      status: 'online',
      avatar: '/avatars/aria.png',
    },
  ],

  health: {
    status: 'healthy',
    version: '2.0.0',
    uptime: 3600,
    services: {
      api: 'healthy',
      llm: 'healthy',
      websocket: 'healthy',
    },
  },

  metrics: {
    totalTasks: 42,
    completedTasks: 38,
    activeTasks: 4,
    avgResponseTime: 1.2,
    tokenUsage: { input: 50000, output: 25000 },
  },
};

/** Check if a URL is a Vite module request (has file extension) vs an API endpoint */
function isViteModuleUrl(url: string): boolean {
  const pathname = new URL(url).pathname;
  return /\.\w{2,5}$/.test(pathname);
}

/**
 * Install API route mocks on a page.
 *
 * Uses a single catch-all route handler with URL inspection to avoid
 * intercepting Vite dev server module requests (e.g. /src/services/api/client.ts)
 * which also contain "/api/" in their path.
 */
export async function mockApiRoutes(page: Page) {
  await page.route(/\/api\//, async (route: Route) => {
    const url = route.request().url();

    // Skip Vite module requests — let them through to the dev server
    if (isViteModuleUrl(url)) {
      await route.continue();
      return;
    }

    const pathname = new URL(url).pathname;

    if (pathname.startsWith('/api/squads')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.squads),
      });
    } else if (pathname.startsWith('/api/agents')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.agents),
      });
    } else if (pathname.startsWith('/api/health')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.health),
      });
    } else if (pathname.startsWith('/api/analytics')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.metrics),
      });
    } else {
      // Generic fallback for unhandled API endpoints
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    }
  });
}

/** Mock SSE streaming endpoint */
export async function mockStreamEndpoint(page: Page, chunks: string[]) {
  await page.route(/\/api\/execute\/stream/, async (route: Route) => {
    const url = route.request().url();
    if (isViteModuleUrl(url)) {
      await route.continue();
      return;
    }

    const body = [
      'event: start\ndata: {"sessionId":"test-session"}\n\n',
      ...chunks.map((c) => `event: text\ndata: {"content":"${c}"}\n\n`),
      'event: done\ndata: {"usage":{"input":100,"output":50}}\n\n',
    ].join('');

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body,
    });
  });
}

/** Mock API error for a specific endpoint */
export async function mockApiError(
  page: Page,
  pattern: string,
  status: number,
  message: string
) {
  await page.route(pattern, async (route: Route) => {
    const url = route.request().url();
    if (isViteModuleUrl(url)) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: message, message }),
    });
  });
}
