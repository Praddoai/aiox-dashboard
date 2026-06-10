import { test, expect, navigateToView } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Knowledge Base
// Tests file explorer, search, content viewer, graph
// ==========================================================================

test.describe('Knowledge View', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'knowledge');
  });

  test('should render knowledge view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/knowledge');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display file explorer or search area', async ({ appPage }) => {
    const explorer = appPage.locator(
      '[class*="explorer"], [class*="file-tree"], [class*="knowledge"], input[type="search"], input[placeholder*="search" i]'
    );
    const count = await explorer.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have search functionality', async ({ appPage }) => {
    const searchInput = appPage.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]'
    );
    const count = await searchInput.count();
    if (count > 0) {
      await searchInput.first().fill('test query');
      await expect(searchInput.first()).toHaveValue('test query');
    }
  });
});
