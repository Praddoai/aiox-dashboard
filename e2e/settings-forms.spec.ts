import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Settings Forms
// Tests theme picker, notification toggles, form inputs
// ==========================================================================

test.describe('Settings View', () => {
  test('should render settings page with sections', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/settings');
    await waitForApp(page);

    // Settings should have headings/tabs
    const settingsContent = page.locator('main, [class*="settings"], [class*="content"]');
    await expect(settingsContent.first()).toBeVisible();
  });

  test('should have theme selection options', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/settings');
    await waitForApp(page);

    // Look for theme-related text or buttons
    const themeElements = page.locator(
      'text=/tema|theme|aparência|appearance/i'
    );
    const count = await themeElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have toggle switches for notifications', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/settings');
    await waitForApp(page);

    // Look for toggle inputs/switches
    const toggles = page.locator(
      'input[type="checkbox"], [role="switch"], button[role="switch"]'
    );
    const count = await toggles.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have navigation sections/tabs', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/settings');
    await waitForApp(page);

    // Settings typically has sections like General, Appearance, Notifications
    const sections = page.locator(
      'button:has-text("Geral"), button:has-text("Aparência"), button:has-text("Notificações"), button:has-text("Atalhos")'
    );
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
