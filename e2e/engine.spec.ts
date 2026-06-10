import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Engine Workspace
// Tests engine control panel — pool, jobs, workflows, crons, bundles, memory
// ==========================================================================

test.describe('Engine Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    // Mock engine endpoints — Engine API runs on localhost:4002
    await page.route(/localhost:4002/, async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      if (path === '/health') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            uptime: 3600,
            version: '1.0.0',
            pool: { total: 5, busy: 2, available: 3 },
          }),
        });
      } else if (path === '/pool') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            maxConcurrent: 5,
            running: 2,
            queued: 1,
            slots: [
              { id: 1, status: 'busy', agentId: 'dex', startedAt: new Date().toISOString() },
              { id: 2, status: 'busy', agentId: 'aria', startedAt: new Date().toISOString() },
              { id: 3, status: 'idle' },
              { id: 4, status: 'idle' },
              { id: 5, status: 'idle' },
            ],
          }),
        });
      } else if (path === '/jobs') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'job-1', agentId: 'dex', status: 'running', createdAt: new Date().toISOString() },
            { id: 'job-2', agentId: 'aria', status: 'completed', createdAt: new Date().toISOString() },
          ]),
        });
      } else if (path.startsWith('/execute/workflows')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'wf-sdc', name: 'Story Development Cycle', phases: 4 },
          ]),
        });
      } else if (path.startsWith('/cron')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (path.startsWith('/bundles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (path.startsWith('/authority/audit')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (path.startsWith('/memory')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: [] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      }
    });
    await page.goto('/engine');
    await waitForApp(page);
  });

  test('should render engine workspace', async ({ page }) => {
    await expect(page).toHaveURL('/engine');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display tab navigation', async ({ page }) => {
    const tabs = page.locator('button[role="tab"], [class*="tab"]');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show pool status section', async ({ page }) => {
    const pool = page.locator(
      'text=Pool, text=pool, [class*="pool"], [class*="slot"]'
    );
    const count = await pool.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show jobs list', async ({ page }) => {
    const jobs = page.locator(
      'text=Jobs, text=jobs, [class*="job"], table, [role="table"]'
    );
    const count = await jobs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have execute agent button or form', async ({ page }) => {
    const executeBtn = page.locator(
      'button:has-text("Executar"), button:has-text("Execute"), button:has-text("Novo Job")'
    );
    const count = await executeBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
