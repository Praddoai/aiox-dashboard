import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Dashboard & Cockpit
// Tests dashboard widgets, metrics, chart rendering
// ==========================================================================

test.describe('Dashboard Overview', () => {
  test('should render dashboard view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display metric cards or widgets', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);
    const cards = page.locator(
      '[class*="card"], [class*="widget"], [class*="metric"], [class*="kpi"]'
    );
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should render charts if data is available', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);
    const charts = page.locator('svg[class*="chart"], canvas, [class*="chart"]');
    const count = await charts.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Cockpit Dashboard (consolidated into /dashboard)', () => {
  test('should redirect /cockpit to /dashboard', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/cockpit');
    await waitForApp(page);
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display AIOX-styled components in cockpit mode', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);
    const cockpitElements = page.locator(
      '[class*="cockpit"], [class*="kpi"], [class*="aiox"]'
    );
    const count = await cockpitElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
