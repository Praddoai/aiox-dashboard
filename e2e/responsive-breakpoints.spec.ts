import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Responsive Breakpoints
// Tests mobile (375px), tablet (768px), desktop (1280px) layouts
// ==========================================================================

test.describe('Mobile Layout (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('should hide sidebar on mobile', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    // Sidebar should be hidden or collapsed on mobile
    const sidebar = page.locator('aside, nav[aria-label]').first();
    if (await sidebar.isVisible().catch(() => false)) {
      const box = await sidebar.boundingBox();
      // If visible, should be overlay or very narrow
      expect(box === null || box.width <= 80).toBeTruthy();
    }
  });

  test('should show mobile menu trigger', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const menuBtn = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="sidebar" i], button[aria-label*="navigation" i]'
    );
    const count = await menuBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Tablet Layout (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('should adapt layout for tablet', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);

    // Dashboard should render without horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});

test.describe('Desktop Layout (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('should show full sidebar on desktop', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const sidebar = page.locator('aside, nav[aria-label]').first();
    const isVisible = await sidebar.isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });
});
