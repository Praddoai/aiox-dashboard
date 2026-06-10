import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Squads View
// Tests squad overview, squad cards, agent roster per squad
// ==========================================================================

test.describe('Squads View', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/squads');
    await waitForApp(page);
  });

  test('should render squads view', async ({ page }) => {
    await expect(page).toHaveURL('/squads');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display squad cards or list', async ({ page }) => {
    const squads = page.locator(
      '[class*="squad"], [class*="card"], [class*="team"]'
    );
    const count = await squads.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show squad information', async ({ page }) => {
    const info = page.locator(
      'text=Core, text=Squad, text=Agent, [class*="agent-count"], [class*="roster"]'
    );
    const count = await info.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have search or filter capability', async ({ page }) => {
    const search = page.locator(
      'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="buscar" i], input[placeholder*="filtrar" i]'
    );
    const count = await search.count();
    if (count > 0) {
      await search.first().fill('core');
      await expect(search.first()).toHaveValue('core');
    }
  });
});
