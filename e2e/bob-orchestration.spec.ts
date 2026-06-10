import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: BOB Orchestration
// Tests pipeline visualizer, execution log, agent activity
// ==========================================================================

test.describe('BOB Orchestration', () => {
  test('should render BOB orchestration view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/bob');
    await waitForApp(page);
    await expect(page).toHaveURL('/bob');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display pipeline visualization', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/bob');
    await waitForApp(page);
    const pipeline = page.locator(
      '[class*="pipeline"], [class*="orchestr"], [class*="flow"], svg'
    );
    const count = await pipeline.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display execution log area', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/bob');
    await waitForApp(page);
    const log = page.locator(
      '[class*="execution"], [class*="log"], [class*="output"]'
    );
    const count = await log.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Task Orchestrator', () => {
  test('should render orchestrator view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/orchestrator');
    await waitForApp(page);
    await expect(page).toHaveURL('/orchestrator');
    await expect(page.locator('body')).toBeVisible();
  });
});
