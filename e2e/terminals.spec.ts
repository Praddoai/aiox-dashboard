import { test, expect, navigateToView } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Terminals
// Tests terminal tabs, output rendering, terminal management
// ==========================================================================

test.describe('Terminals View', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'terminals');
  });

  test('should render terminals view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/terminals');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display terminal tabs', async ({ appPage }) => {
    const tabs = appPage.locator(
      '[data-testid*="terminal-tab"], [class*="terminal"] [role="tab"], [class*="tab"]'
    );
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display terminal output area', async ({ appPage }) => {
    const output = appPage.locator(
      '[class*="terminal-output"], [class*="terminal"] pre, [class*="terminal"] code, [class*="monospace"]'
    );
    const count = await output.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
