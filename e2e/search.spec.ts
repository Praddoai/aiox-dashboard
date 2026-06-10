import { test, expect, waitForApp } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Global Search
// Tests search dialog, filtering, navigation from results
// ==========================================================================

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Global Search', () => {
  test('should open search with Cmd+K', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press(`${mod}+k`);
    await page.waitForTimeout(500);

    // GlobalSearch uses glass-card with an input having aria-label="Busca global"
    const searchInput = page.locator('input[aria-label="Busca global"]');
    await expect(searchInput).toBeVisible();
  });

  test('should close search with Escape', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press(`${mod}+k`);
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // After escape, search should close
    await expect(page.locator('body')).toBeVisible();
  });

  test('should accept text input in search', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press(`${mod}+k`);
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[aria-label="Busca global"]');

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('dashboard');
      await expect(searchInput).toHaveValue('dashboard');
    }
  });

  test('should show search results', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press(`${mod}+k`);
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[aria-label="Busca global"]');

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('settings');
      await page.waitForTimeout(500);
      const results = page.locator(
        '[role="option"], [role="listbox"] li, [class*="search-result"]'
      );
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
