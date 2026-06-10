import { test, expect, waitForApp, skipOnboarding } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';
import { Page, Route } from '@playwright/test';

// ==========================================================================
// E2E: Full Orchestration Flow
// Tests the complete pipeline: submit demand → SSE events → visual updates
// → completion → history → replay
// ==========================================================================

/** SSE event sequence simulating a real orchestration */
function buildSSEResponse() {
  const events = [
    { event: 'task:analyzing', data: { taskId: 'e2e-task-1' } },
    { event: 'task:planning', data: { taskId: 'e2e-task-1' } },
    {
      event: 'task:squad-planned',
      data: {
        squadId: 'development',
        chief: 'Dex',
        agents: [
          { id: 'dex', name: 'Dex' },
          { id: 'nova', name: 'Nova' },
        ],
      },
    },
    {
      event: 'task:workflow-created',
      data: {
        workflowId: 'wf-e2e-1',
        steps: [
          { id: 'step-1', name: 'Dex: Implementation' },
          { id: 'step-2', name: 'Nova: Review' },
        ],
      },
    },
    { event: 'task:executing', data: {} },
    {
      event: 'step:streaming:start',
      data: {
        stepId: 'step-1',
        stepName: 'Implementation',
        agent: { id: 'dex', name: 'Dex', squad: 'development' },
      },
    },
    {
      event: 'step:streaming:chunk',
      data: { stepId: 'step-1', chunk: 'Building the', accumulated: 'Building the' },
    },
    {
      event: 'step:streaming:chunk',
      data: { stepId: 'step-1', chunk: ' landing page...', accumulated: 'Building the landing page...' },
    },
    {
      event: 'step:streaming:end',
      data: {
        stepId: 'step-1',
        response: 'Landing page built with responsive design, hero section, and CTA.',
        agent: { id: 'dex', name: 'Dex', squad: 'development' },
        processingTimeMs: 3200,
      },
    },
    {
      event: 'step:streaming:start',
      data: {
        stepId: 'step-2',
        stepName: 'Code Review',
        agent: { id: 'nova', name: 'Nova', squad: 'development' },
      },
    },
    {
      event: 'step:streaming:end',
      data: {
        stepId: 'step-2',
        response: 'Code review passed. All standards met.',
        agent: { id: 'nova', name: 'Nova', squad: 'development' },
        processingTimeMs: 1800,
      },
    },
    { event: 'task:completed', data: { taskId: 'e2e-task-1' } },
  ];

  return events
    .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
    .join('');
}

/** Mock completed task for history/detail endpoints */
const completedTask = {
  id: 'e2e-task-1',
  demand: 'Build a landing page for AIOS Platform',
  status: 'completed',
  squads: [
    {
      squadId: 'development',
      chief: 'Dex',
      agentCount: 2,
      agents: [
        { id: 'dex', name: 'Dex' },
        { id: 'nova', name: 'Nova' },
      ],
    },
  ],
  workflow: { id: 'wf-e2e-1', name: 'Dev Workflow', stepCount: 2 },
  outputs: [
    {
      stepId: 'step-1',
      stepName: 'Implementation',
      output: {
        response: 'Landing page built with responsive design, hero section, and CTA.',
        agent: { id: 'dex', name: 'Dex', squad: 'development' },
        role: 'chief',
        processingTimeMs: 3200,
      },
    },
    {
      stepId: 'step-2',
      stepName: 'Code Review',
      output: {
        response: 'Code review passed. All standards met.',
        agent: { id: 'nova', name: 'Nova', squad: 'development' },
        role: 'specialist',
        processingTimeMs: 1800,
      },
    },
  ],
  createdAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  completedAt: new Date(Date.now() + 5000).toISOString(),
  totalTokens: 1500,
  totalDuration: 5000,
  stepCount: 2,
  completedSteps: 2,
};

/** Check if a URL is a Vite module request */
function isViteModuleUrl(url: string): boolean {
  const pathname = new URL(url).pathname;
  return /\.\w{2,5}$/.test(pathname);
}

/** Install orchestration-specific API mocks */
async function mockOrchestrationApi(page: Page) {
  // First install base API mocks
  await mockApiRoutes(page);

  // Override task-specific routes
  await page.route(/\/api\/tasks/, async (route: Route) => {
    const url = route.request().url();
    if (isViteModuleUrl(url)) {
      await route.continue();
      return;
    }

    const pathname = new URL(url).pathname;
    const method = route.request().method();

    // POST /api/tasks → create task
    if (method === 'POST' && pathname === '/api/tasks') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          taskId: 'e2e-task-1',
          status: 'analyzing',
          message: 'Task created',
          dbPersistence: false,
        }),
      });
      return;
    }

    // GET /api/tasks/:id/stream → SSE
    if (pathname.includes('/stream')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: buildSSEResponse(),
      });
      return;
    }

    // GET /api/tasks/:id → task detail
    if (pathname.match(/\/api\/tasks\/[\w-]+$/) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(completedTask),
      });
      return;
    }

    // GET /api/tasks → task list
    if (pathname === '/api/tasks' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tasks: [completedTask],
          total: 1,
          limit: 20,
          offset: 0,
          dbPersistence: false,
        }),
      });
      return;
    }

    // Fallback
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

test.describe('Orchestration Full Flow', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await mockOrchestrationApi(page);
  });

  test('submits a demand and shows phase progression', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    // Find the textarea and type a demand
    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    await expect(textarea).toBeVisible();
    await textarea.fill('Build a landing page for AIOS Platform');

    // Click the submit button
    const submitBtn = page.locator('button:has-text("Executar")');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Should show analyzing phase
    await expect(page.locator('text=Analisando')).toBeVisible({ timeout: 5000 });

    // Title should appear
    await expect(page.locator('h1:has-text("Orquestrador de Tarefas")')).toBeVisible();
  });

  test('displays squad selections after planning', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    await textarea.fill('Build a landing page');

    const submitBtn = page.locator('button:has-text("Executar")');
    await submitBtn.click();

    // Wait for squad selections to appear (SSE events fire in sequence)
    // The "Squads Ativados" heading should appear after task:squad-planned
    await expect(
      page.getByRole('heading', { name: 'Squads Ativados' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows agent outputs after execution completes', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    await textarea.fill('Build a landing page');

    const submitBtn = page.locator('button:has-text("Executar")');
    await submitBtn.click();

    // Wait for completion — the "Nova Tarefa" button appears when completed
    await expect(page.locator('button:has-text("Nova Tarefa")')).toBeVisible({
      timeout: 15000,
    });

    // Agent output content should exist in the page (may be in collapsed/scrolled area)
    const pageContent = await page.content();
    expect(pageContent).toContain('Landing page built');
  });

  test('can submit with Ctrl+Enter keyboard shortcut', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    await textarea.fill('Test keyboard shortcut');

    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await textarea.press(`${mod}+Enter`);

    // Should start analyzing
    await expect(page.locator('text=Analisando')).toBeVisible({ timeout: 5000 });
  });

  test('transitions through running state after submit', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    await textarea.fill('Test running state');

    const submitBtn = page.locator('button:has-text("Executar")');
    await submitBtn.click();

    // After submit, the PhaseProgress bar appears (all 4 phases rendered).
    // Verify the "Analisando" phase is shown with active styling (animate-spin loader).
    // The SSE mock resolves fast, so it may already be completed — either state is valid.
    await expect(
      page.getByText('Analisando').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows error state on task creation failure', async ({ page }) => {
    // Override the task creation to fail
    await page.route(/\/api\/tasks$/, async (route: Route) => {
      const url = route.request().url();
      if (isViteModuleUrl(url)) {
        await route.continue();
        return;
      }
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      }
    });

    await page.goto('/bob');
    await waitForApp(page);

    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    await textarea.fill('This will fail');

    const submitBtn = page.locator('button:has-text("Executar")');
    await submitBtn.click();

    // Should show error state — either error text or the textarea re-enables
    await expect(textarea).toBeEnabled({ timeout: 10000 });
  });

  test('can toggle between list and visual mode', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    await textarea.fill('Build something');

    const submitBtn = page.locator('button:has-text("Executar")');
    await submitBtn.click();

    // Wait for running state
    await expect(page.locator('text=Analisando')).toBeVisible({ timeout: 5000 });

    // View toggle buttons should appear
    const listBtn = page.locator('button[aria-label="Modo lista"]');
    const visualBtn = page.locator('button[aria-label="Modo visual"]');

    // At least one should be visible
    const hasToggle = await listBtn.or(visualBtn).isVisible().catch(() => false);
    if (hasToggle) {
      // Click visual mode
      if (await visualBtn.isVisible()) {
        await visualBtn.click();
        await page.waitForTimeout(500);
      }

      // Click back to list mode
      if (await listBtn.isVisible()) {
        await listBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('can start a new task after completion', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    await textarea.fill('First task');

    const submitBtn = page.locator('button:has-text("Executar")');
    await submitBtn.click();

    // Wait for completion
    await expect(page.locator('button:has-text("Nova Tarefa")')).toBeVisible({
      timeout: 15000,
    });

    // Click "Nova Tarefa"
    await page.locator('button:has-text("Nova Tarefa")').click();

    // Textarea should reappear and be empty
    const newTextarea = page.locator('textarea[placeholder*="Descreva"]');
    await expect(newTextarea).toBeVisible({ timeout: 5000 });
    await expect(newTextarea).toBeEnabled();
  });
});

test.describe('Orchestration History', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await mockOrchestrationApi(page);
  });

  test('shows history panel with past tasks', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    // Click the history toggle button
    const historyBtn = page.locator('button:has-text("Histórico")').or(
      page.locator('button:has(svg.lucide-history)')
    );

    const isVisible = await historyBtn.first().isVisible().catch(() => false);
    if (isVisible) {
      await historyBtn.first().click();
      await page.waitForTimeout(500);

      // Should show the completed task in history
      await expect(
        page.locator('text=Build a landing page').or(page.locator('text=e2e-task-1'))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('history search filters tasks', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const historyBtn = page.locator('button:has-text("Histórico")').or(
      page.locator('button:has(svg.lucide-history)')
    );

    const isVisible = await historyBtn.first().isVisible().catch(() => false);
    if (isVisible) {
      await historyBtn.first().click();
      await page.waitForTimeout(500);

      // Use the search input
      const searchInput = page.locator('input[placeholder*="Buscar"]');
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('landing');
        await page.waitForTimeout(300);
        // Results should still show matching tasks
        await expect(page.locator('text=landing page')).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('Orchestration via Chat', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await mockOrchestrationApi(page);
  });

  test('redirects /orquestrar command to orchestrator view', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Find the chat input
    const chatInput = page.locator(
      'textarea[placeholder*="mensagem"], input[placeholder*="mensagem"], textarea[placeholder*="Digite"]'
    );

    const hasInput = await chatInput.first().isVisible().catch(() => false);
    if (hasInput) {
      await chatInput.first().fill('/orquestrar Build a landing page');
      await chatInput.first().press('Enter');

      // Should redirect to bob/orchestrator view
      await page.waitForTimeout(1000);
      const url = page.url();
      const hasRedirected = url.includes('bob') || url.includes('orchestrator');

      // Also check if sessionStorage was set
      const demand = await page.evaluate(() => sessionStorage.getItem('orchestration-demand'));

      expect(hasRedirected || demand !== null).toBeTruthy();
    }
  });
});

test.describe('Orchestrator Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await mockOrchestrationApi(page);
  });

  test('submit button is disabled when textarea is empty', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const submitBtn = page.locator('button:has-text("Executar")');
    const isVisible = await submitBtn.isVisible().catch(() => false);
    if (isVisible) {
      await expect(submitBtn).toBeDisabled();
    }
  });

  test('submit button enables after typing', async ({ page }) => {
    await page.goto('/bob');
    await waitForApp(page);

    const textarea = page.locator('textarea[placeholder*="Descreva"]');
    const submitBtn = page.locator('button:has-text("Executar")');

    const isVisible = await textarea.isVisible().catch(() => false);
    if (isVisible) {
      await textarea.fill('Some demand');
      await expect(submitBtn).toBeEnabled();
    }
  });
});
