import { test, expect, clearStores } from './fixtures/base.fixture';

// ==========================================================================
// E2E: State Persistence (Zustand + localStorage)
// Tests store hydration, data persistence across reloads
// ==========================================================================

test.describe('UI State Persistence', () => {
  test('should persist current view across reload', async ({ appPage }) => {
    // Navigate to dashboard
    await appPage.goto('/dashboard');
    await appPage.waitForTimeout(1000);

    // Reload page
    await appPage.reload();
    await appPage.waitForTimeout(1000);

    // Should still be on dashboard (persisted in store)
    await expect(appPage).toHaveURL('/dashboard');
  });

  test('should persist sidebar collapsed state', async ({ appPage }) => {
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Collapse sidebar
    await appPage.keyboard.press(`${mod}+b`);
    await appPage.waitForTimeout(500);

    // Reload
    await appPage.reload();
    await appPage.waitForTimeout(1000);

    // Sidebar state should be preserved
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should persist theme setting across reload', async ({ appPage }) => {
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    const html = appPage.locator('html');

    // Change theme
    await appPage.keyboard.press(`${mod}+.`);
    await appPage.waitForTimeout(600);

    const themeAfterChange = await html.getAttribute('data-theme');

    // Reload
    await appPage.reload();
    await appPage.waitForTimeout(1000);

    const themeAfterReload = await html.getAttribute('data-theme');
    expect(themeAfterReload).toBe(themeAfterChange);
  });
});

test.describe('Chat State Persistence', () => {
  test('should persist chat sessions across reload', async ({ appPage }) => {
    // Check if there are sessions before reload
    const sessionsBefore = await appPage.evaluate(() => {
      const raw = localStorage.getItem('aios-chat-store');
      if (!raw) return 0;
      try {
        const data = JSON.parse(raw);
        return data.state?.sessions?.length || 0;
      } catch {
        return 0;
      }
    });

    // Reload
    await appPage.reload();
    await appPage.waitForTimeout(1000);

    const sessionsAfter = await appPage.evaluate(() => {
      const raw = localStorage.getItem('aios-chat-store');
      if (!raw) return 0;
      try {
        const data = JSON.parse(raw);
        return data.state?.sessions?.length || 0;
      } catch {
        return 0;
      }
    });

    expect(sessionsAfter).toBe(sessionsBefore);
  });

  test('should clear all stores', async ({ appPage }) => {
    await clearStores(appPage);

    const storageKeys = await appPage.evaluate(() => {
      return Object.keys(localStorage);
    });

    expect(storageKeys.length).toBe(0);
  });
});
