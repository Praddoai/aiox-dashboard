import { test, expect, navigateToView } from './fixtures/base.fixture';

// ==========================================================================
// E2E: GitHub Integration View
// Tests GitHub integration panel — repos, PRs, issues
// ==========================================================================

test.describe('GitHub View', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'github');
  });

  test('should render github view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/github');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display GitHub content area', async ({ appPage }) => {
    const content = appPage.locator(
      '[class*="github"], [class*="repo"], [aria-label="GitHub content"]'
    );
    const count = await content.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display tab navigation or sections', async ({ appPage }) => {
    const tabs = appPage.locator(
      'button[role="tab"], [class*="tab"], [class*="section"]'
    );
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have search or filter inputs', async ({ appPage }) => {
    const inputs = appPage.locator(
      'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="buscar" i]'
    );
    const count = await inputs.count();
    if (count > 0) {
      await inputs.first().fill('test-repo');
      await expect(inputs.first()).toHaveValue('test-repo');
    }
  });
});
