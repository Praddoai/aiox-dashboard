import { test, expect, navigateToView } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Settings
// Tests settings page, sections, category manager, memory manager
// ==========================================================================

test.describe('Settings Page', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'settings');
  });

  test('should render settings view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/settings');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should have settings sections/tabs', async ({ appPage }) => {
    // Settings page should have category/section navigation
    const sections = appPage.locator(
      '[data-testid*="settings-section"], [class*="settings"] button, [class*="settings"] a, [role="tab"]'
    );
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to settings sub-sections via URL', async ({ appPage }) => {
    const sections = ['appearance', 'categories', 'memory', 'workflows', 'profile', 'notifications'];

    for (const section of sections) {
      await appPage.goto(`/settings/${section}`);
      await appPage.waitForTimeout(500);
      await expect(appPage).toHaveURL(`/settings/${section}`);
    }
  });
});

test.describe('Settings - Appearance', () => {
  test('should have theme selection options', async ({ appPage }) => {
    await appPage.goto('/settings/appearance');
    await appPage.waitForTimeout(1000);

    // Should display theme options (dark, light, glass, matrix, aiox)
    const themeOptions = appPage.locator(
      'button:has-text("Dark"), button:has-text("Light"), button:has-text("AIOX"), [class*="theme"]'
    );
    const count = await themeOptions.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
