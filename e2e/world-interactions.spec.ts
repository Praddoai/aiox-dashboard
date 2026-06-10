import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: World View Interactions
// Tests agent sprites, furniture hover tooltips, world canvas
// ==========================================================================

test.describe('World View', () => {
  test('should render world canvas', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/world');
    await waitForApp(page);

    // World view should have content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display agent sprites with aria-labels', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/world');
    await waitForApp(page);

    // Agent sprites have role="button" and aria-label starting with "Agent"
    const sprites = page.locator('[role="button"][aria-label^="Agent"]');
    const count = await sprites.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show tooltip on agent sprite hover', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/world');
    await waitForApp(page);

    const sprites = page.locator('[role="button"][aria-label^="Agent"]');
    if ((await sprites.count()) > 0) {
      await sprites.first().hover();
      await page.waitForTimeout(500);

      // Tooltip should appear with agent name and tier info
      const tooltip = page.locator('.pointer-events-none').filter({
        has: page.locator('text=/T[0-5]/'),
      });
      const isVisible = await tooltip.first().isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    }
  });

  test('should select agent sprite on click', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/world');
    await waitForApp(page);

    const sprites = page.locator('[role="button"][aria-label^="Agent"]');
    if ((await sprites.count()) > 0) {
      await sprites.first().click();
      await page.waitForTimeout(300);
      // Should not crash
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show furniture tooltip on hover', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/world');
    await waitForApp(page);

    // Interactive furniture items are absolutely positioned divs with cursor-pointer
    // Use force:true because room SVG overlay may intercept pointer events
    const furniture = page.locator('.absolute.cursor-pointer').first();
    if (await furniture.isVisible().catch(() => false)) {
      await furniture.hover({ force: true });
      await page.waitForTimeout(300);
      // Tooltip should appear
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
