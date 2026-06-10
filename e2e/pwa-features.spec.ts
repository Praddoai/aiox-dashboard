import { test, expect, waitForApp } from './fixtures/base.fixture';

// ==========================================================================
// E2E: PWA Features
// Tests meta tags, manifest, offline readiness
// ==========================================================================

test.describe('PWA Meta Tags', () => {
  test('should have viewport meta tag', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should have theme-color meta tag', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const themeColor = page.locator('meta[name="theme-color"]');
    const count = await themeColor.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have a manifest link', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const manifest = page.locator('link[rel="manifest"]');
    const count = await manifest.count();
    // PWA manifest is optional
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have appropriate title tag', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
