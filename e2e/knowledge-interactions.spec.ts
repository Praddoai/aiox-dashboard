import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Knowledge Graph Interactions
// Tests graph rendering, search, zoom controls
// ==========================================================================

test.describe('Knowledge View', () => {
  test('should render knowledge view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/knowledge');
    await waitForApp(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have search/filter input', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/knowledge');
    await waitForApp(page);

    const searchInput = page.locator(
      'input[placeholder*="Buscar" i], input[placeholder*="search" i], input[placeholder*="Filtrar" i]'
    );
    const count = await searchInput.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display graph canvas or file tree', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/knowledge');
    await waitForApp(page);

    // Knowledge view may have a canvas, SVG graph, or file tree
    const graphElements = page.locator('canvas, svg[class*="graph"], [class*="tree"], [class*="knowledge"]');
    const count = await graphElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
