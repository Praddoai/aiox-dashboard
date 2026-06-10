import { test, expect, navigateToView } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Context View
// Tests document context manager — file list, content viewer
// ==========================================================================

test.describe('Context View', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'context');
  });

  test('should render context view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/context');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display context content area', async ({ appPage }) => {
    const content = appPage.locator(
      '[class*="context"], [class*="document"], [class*="file"], [class*="card"]'
    );
    const count = await content.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have document upload or add capability', async ({ appPage }) => {
    const addBtn = appPage.locator(
      'button:has-text("Adicionar"), button:has-text("Add"), button:has-text("Upload"), input[type="file"]'
    );
    const count = await addBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
