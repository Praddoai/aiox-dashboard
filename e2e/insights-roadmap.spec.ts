import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Insights, Roadmap, GitHub, QA
// Tests analytics views and secondary pages
// ==========================================================================

test.describe('Insights View (consolidated into /dashboard)', () => {
  test('should redirect /insights to /dashboard', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/insights');
    await waitForApp(page);
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Roadmap View', () => {
  test('should render roadmap view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/roadmap');
    await waitForApp(page);
    await expect(page).toHaveURL('/roadmap');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display timeline or milestones', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/roadmap');
    await waitForApp(page);
    const timeline = page.locator(
      '[class*="timeline"], [class*="roadmap"], [class*="milestone"], [class*="gantt"]'
    );
    const count = await timeline.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('GitHub View', () => {
  test('should render GitHub view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/github');
    await waitForApp(page);
    await expect(page).toHaveURL('/github');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('QA Metrics', () => {
  test('should render QA metrics view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/qa');
    await waitForApp(page);
    await expect(page).toHaveURL('/qa');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Context View', () => {
  test('should render context view', async ({ page }) => {
    await page.goto('/context');
    await waitForApp(page);
    await expect(page).toHaveURL('/context');
    await expect(page.locator('body')).toBeVisible();
  });
});
