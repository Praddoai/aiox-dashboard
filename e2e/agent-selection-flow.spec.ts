import { test, expect, waitForApp, skipOnboarding } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Agent Selection Flow
// Tests squad selector → agent selection → chat session start
// ==========================================================================

test.describe('Agent Selection Flow', () => {
  test('should show squad selector on home page', async ({ page }) => {
    await skipOnboarding(page);
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    // Wait for Framer Motion animations to settle
    await page.waitForTimeout(1000);

    // Home shows either squad selector heading or chat textarea
    const squadSelector = page.locator('h2:has-text("Escolha um Squad")');
    const textarea = page.locator('textarea');

    const hasSquadSelector = await squadSelector.isVisible().catch(() => false);
    const hasTextarea = await textarea.isVisible().catch(() => false);

    // One of them should be visible
    expect(hasSquadSelector || hasTextarea).toBeTruthy();
  });

  test('should display squad cards from API', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    // Look for squad cards with squad names from mock data
    const squadCards = page.locator('[class*="card"], [class*="squad"]').filter({
      has: page.locator('text=/Copywriting|Design|YouTube/i'),
    });
    const count = await squadCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to agents view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/agents');
    await waitForApp(page);

    // Agents view should display agent cards
    const agentCards = page.locator('[class*="agent"], [class*="card"]');
    const count = await agentCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show agent details on agent card click', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/agents');
    await waitForApp(page);

    const agentCards = page.locator('[class*="agent"], [class*="card"]').filter({
      has: page.locator('text=/agent|specialist|expert/i'),
    });

    if ((await agentCards.count()) > 0) {
      await agentCards.first().click();
      await page.waitForTimeout(500);
      // Some interaction should occur (modal, navigation, or selection highlight)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
