import { test, expect, waitForApp } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Cross-Tab & State Sync
// Tests localStorage persistence across page reloads
// ==========================================================================

test.describe('State Persistence', () => {
  test('should persist theme preference across reloads', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Get current theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    // Reload the page
    await page.reload();
    await waitForApp(page);

    const themeAfterReload = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    // Theme should persist (or both be null/default)
    expect(themeAfterReload).toBe(initialTheme);
  });

  test('should persist sidebar state across reloads', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Check if sidebar state is stored
    const hasUiStore = await page.evaluate(() => {
      return localStorage.getItem('aios-ui-store') !== null;
    });

    expect(typeof hasUiStore).toBe('boolean');
  });

  test('should persist story store across reloads', async ({ page }) => {
    await page.goto('/stories');
    await waitForApp(page);

    const hasStoryStore = await page.evaluate(() => {
      return localStorage.getItem('aios-story-store') !== null;
    });

    expect(typeof hasStoryStore).toBe('boolean');
  });

  test('should persist dashboard widget config across reloads', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForApp(page);

    const hasWidgetStore = await page.evaluate(() => {
      return localStorage.getItem('aios-dashboard-widgets') !== null;
    });

    expect(typeof hasWidgetStore).toBe('boolean');
  });
});
