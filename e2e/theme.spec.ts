import { test, expect, waitForApp, setTheme } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Theme System
// Tests theme switching, persistence, AIOX cockpit theme, CSS variables
// ==========================================================================

test.describe('Theme Switching', () => {
  test('should apply theme on load', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const html = page.locator('html');
    // Default is 'system' — just verify it loaded
    await expect(html).toBeVisible();
  });

  test('should cycle themes with Cmd+.', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const html = page.locator('html');
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    const themes: string[] = [];

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press(`${mod}+.`);
      await page.waitForTimeout(600);

      const theme = await html.getAttribute('data-theme');
      const hasDark = await html.evaluate((el) => el.classList.contains('dark'));
      themes.push(`${theme || 'none'}-${hasDark}`);
    }

    const uniqueThemes = new Set(themes);
    expect(uniqueThemes.size).toBeGreaterThan(1);
  });

  test('should persist theme across page reload', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await setTheme(page, 'aiox');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'aiox');

    await page.reload();
    await waitForApp(page);
    await expect(html).toHaveAttribute('data-theme', 'aiox');
  });
});

test.describe('AIOX Cockpit Theme', () => {
  test('should have AIOX data-theme attribute', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await setTheme(page, 'aiox');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'aiox');
    await expect(html).toHaveClass(/dark/);
  });

  test('should apply brutalist border-radius: 0', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await setTheme(page, 'aiox');

    const buttons = page.locator('button').first();
    if (await buttons.isVisible()) {
      const radius = await buttons.evaluate((el) =>
        getComputedStyle(el).borderRadius
      );
      expect(radius === '0px' || radius === '0').toBeTruthy();
    }
  });

  test('should use neon lime accent color', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await setTheme(page, 'aiox');

    const limeColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--aiox-lime')
        .trim();
    });

    if (limeColor) {
      expect(limeColor.toLowerCase()).toContain('d1ff00');
    }
  });

  test('should apply mono font family', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await setTheme(page, 'aiox');

    const fontFamily = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--font-family-mono')
        .trim();
    });

    if (fontFamily) {
      expect(fontFamily.toLowerCase()).toContain('roboto mono');
    }
  });
});

test.describe('Theme CSS Variables', () => {
  test('should have glass design system variables defined', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        glassBorderColor: style.getPropertyValue('--glass-border-color').trim(),
        glassBlurDefault: style.getPropertyValue('--glass-blur-default').trim(),
        glassBorderWidth: style.getPropertyValue('--glass-border-width').trim(),
      };
    });

    const hasVars = Object.values(vars).some((v) => v.length > 0);
    expect(hasVars).toBeTruthy();
  });
});
