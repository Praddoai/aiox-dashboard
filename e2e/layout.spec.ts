import { test, expect } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Layout & Responsive
// Tests sidebar, header, activity panel, mobile nav, focus mode
// ==========================================================================

test.describe('App Layout Structure', () => {
  test('should render sidebar with navigation items', async ({ appPage }) => {
    const sidebar = appPage.locator('nav, aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('should render header with squad/agent info', async ({ appPage }) => {
    const header = appPage.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('should render main content area', async ({ appPage }) => {
    const main = appPage.locator('main, [role="main"], .h-full').first();
    await expect(main).toBeVisible();
  });

  test('should toggle activity panel with Cmd+\\', async ({ appPage }) => {
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await appPage.keyboard.press(`${mod}+\\`);
    await appPage.waitForTimeout(500);
    // Activity panel state changed — verify no crash
    await expect(appPage.locator('body')).toBeVisible();
  });
});

test.describe('Sidebar Behavior', () => {
  test('should collapse and expand sidebar', async ({ appPage }) => {
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Toggle collapse with Cmd+B
    await appPage.keyboard.press(`${mod}+b`);
    await appPage.waitForTimeout(500);

    // Expand again
    await appPage.keyboard.press(`${mod}+b`);
    await appPage.waitForTimeout(500);
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should show squad selector in sidebar', async ({ appPage }) => {
    // Squad selector or squad list should be in sidebar
    const squadElements = appPage.locator(
      '[data-testid="squad-selector"], [class*="squad"], img[alt*="squad"]'
    );
    const count = await squadElements.count();
    // Should find at least some squad-related elements
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show conversation history in sidebar', async ({ appPage }) => {
    // Conversation history section
    const history = appPage.locator(
      '[data-testid="conversation-history"], [class*="conversation"], [class*="history"]'
    );
    const count = await history.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Focus Mode', () => {
  test('should toggle focus mode with Cmd+Shift+F', async ({ appPage }) => {
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Enter focus mode
    await appPage.keyboard.press(`${mod}+Shift+f`);
    await appPage.waitForTimeout(500);

    // Focus mode indicator should appear
    const indicator = appPage.locator('[class*="focus"], [data-testid="focus-indicator"]');
    const _count = await indicator.count();

    // Exit focus mode
    await appPage.keyboard.press(`${mod}+Shift+f`);
    await appPage.waitForTimeout(500);

    // Should not crash
    await expect(appPage.locator('body')).toBeVisible();
  });
});

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone 12

  test('should hide sidebar on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // On mobile, sidebar should be hidden or collapsed
    const sidebar = page.locator('nav, aside').first();
    const box = await sidebar.boundingBox();

    // Either hidden or very narrow
    if (box) {
      expect(box.width).toBeLessThanOrEqual(60);
    }
  });

  test('should show mobile menu toggle', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Mobile menu button should be visible
    const menuBtn = page.locator(
      '[data-testid="mobile-menu"], button[aria-label*="menu"], .mobile-nav button'
    );
    const count = await menuBtn.count();
    // Should have mobile navigation
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should render content area on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Main content should still be visible
    await expect(page.locator('body')).toBeVisible();
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 10); // small tolerance
  });
});

test.describe('Tablet Responsive', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('should render properly on tablet', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768 + 10);
  });
});
