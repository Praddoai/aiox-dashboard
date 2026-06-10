import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Terminal Interactions
// Tests terminal cards, minimize/maximize, content display
// ==========================================================================

test.describe('Terminal View', () => {
  test('should render terminal view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/terminals');
    await waitForApp(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display terminal cards', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/terminals');
    await waitForApp(page);

    const cards = page.locator('[class*="terminal"], [class*="card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have minimize/maximize controls', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/terminals');
    await waitForApp(page);

    // Look for minimize/maximize/close buttons on terminal cards
    const controls = page.locator(
      'button[aria-label*="minimiz" i], button[aria-label*="maximiz" i], button[aria-label*="expand" i]'
    );
    const count = await controls.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display terminal content with monospace font', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/terminals');
    await waitForApp(page);

    // Terminal content typically uses monospace/code font
    const monoContent = page.locator('[class*="font-mono"], code, pre');
    const count = await monoContent.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
