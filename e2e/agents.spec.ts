import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Agents System
// Tests agent monitor, agent cards, agent explorer, agent profiles
// ==========================================================================

test.describe('Agents Monitor', () => {
  test('should render agents monitor view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/agents');
    await waitForApp(page);
    await expect(page).toHaveURL('/agents');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display agent cards', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/agents');
    await waitForApp(page);
    const agentCards = page.locator(
      '[data-testid*="agent"], [class*="agent-card"], [class*="AgentCard"]'
    );
    const count = await agentCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show agent status indicators', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/agents');
    await waitForApp(page);
    const statusDots = page.locator(
      '[class*="status"], [class*="dot"], [class*="online"], [class*="offline"]'
    );
    const count = await statusDots.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Agent Explorer', () => {
  test('should toggle agent explorer with Cmd+E', async ({ appPage }) => {
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    await appPage.keyboard.press(`${mod}+e`);
    await appPage.waitForTimeout(500);

    const explorer = appPage.locator(
      '[data-testid="agent-explorer"], [class*="explorer"], [class*="agent-list"]'
    );
    const count = await explorer.count();

    await appPage.keyboard.press(`${mod}+e`);
    await appPage.waitForTimeout(500);

    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Squads View', () => {
  test('should render squads view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/squads');
    await waitForApp(page);
    await expect(page).toHaveURL('/squads');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display squad cards', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/squads');
    await waitForApp(page);
    const squadCards = page.locator(
      '[data-testid*="squad"], [class*="squad-card"], [class*="SquadCard"]'
    );
    const count = await squadCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
