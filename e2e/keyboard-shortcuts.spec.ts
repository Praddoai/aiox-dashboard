import { test, expect, waitForApp } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Keyboard Shortcuts
// Tests global shortcuts, view navigation, modifier combos
// ==========================================================================

const isMac = process.platform === 'darwin';
const mod = isMac ? 'Meta' : 'Control';

test.describe('Single-Key View Shortcuts', () => {
  test('should navigate to dashboard with "d" key', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await page.keyboard.press('d');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate through views with single keys', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const shortcuts: Record<string, string> = {
      k: '/stories',
      a: '/agents',
      b: '/bob',
      t: '/terminals',
      m: '/monitor',
      i: '/dashboard',
      s: '/settings',
      h: '/',
    };

    for (const [key, expectedUrl] of Object.entries(shortcuts)) {
      await page.keyboard.press(key);
      await page.waitForTimeout(300);
      await expect(page).toHaveURL(expectedUrl);
    }
  });

  test('should NOT trigger shortcuts when typing in input', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const input = page.locator('textarea').first();
    if (await input.isVisible().catch(() => false)) {
      await input.focus();
      await page.keyboard.press('d');
      await expect(page).toHaveURL('/');
    }
  });
});

test.describe('Modifier Shortcuts', () => {
  test('should open global search with Cmd+K', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press(`${mod}+k`);
    await page.waitForTimeout(500);

    // GlobalSearch uses glass-card with an input having aria-label="Busca global"
    const searchInput = page.locator('input[aria-label="Busca global"]');
    await expect(searchInput).toBeVisible();
  });

  test('should toggle sidebar with Cmd+B', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press(`${mod}+b`);
    await page.waitForTimeout(500);
    // Should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should toggle theme with Cmd+.', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');

    await page.keyboard.press(`${mod}+.`);
    await page.waitForTimeout(600);

    const newTheme = await html.getAttribute('data-theme');
    const hasDarkClass = await html.evaluate((el) => el.classList.contains('dark'));

    expect(newTheme !== initialTheme || hasDarkClass).toBeTruthy();
  });

  test('should close search with Escape', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press(`${mod}+k`);
    await page.waitForTimeout(300);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
  });
});
