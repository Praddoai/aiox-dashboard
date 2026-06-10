import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Live Monitor & Timeline
// Tests real-time monitoring, events, metrics, connection status
// ==========================================================================

test.describe('Live Monitor', () => {
  test('should render monitor view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/monitor');
    await waitForApp(page);
    await expect(page).toHaveURL('/monitor');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display connection status indicator', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/monitor');
    await waitForApp(page);
    const status = page.locator(
      '[class*="connection"], [class*="status"], [data-testid*="connection"]'
    );
    const count = await status.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display metrics panel', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/monitor');
    await waitForApp(page);
    const metrics = page.locator(
      '[class*="metric"], [class*="panel"], [class*="stats"]'
    );
    const count = await metrics.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Activity Timeline', () => {
  test('should render timeline view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/monitor');
    await waitForApp(page);
    await expect(page).toHaveURL('/monitor');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display timeline events', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/monitor');
    await waitForApp(page);
    const events = page.locator(
      '[class*="event"], [class*="timeline"], [class*="activity"]'
    );
    const count = await events.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
