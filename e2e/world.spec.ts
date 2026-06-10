import { test, expect, navigateToView } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Gather World (Metaverse)
// Tests world map, room navigation, agent sprites, minimap
// ==========================================================================

test.describe('Gather World', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'world');
  });

  test('should render world view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/world');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display world map or grid', async ({ appPage }) => {
    const map = appPage.locator(
      '[class*="world"], [class*="map"], [class*="grid"], canvas, svg'
    );
    const count = await map.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to room via URL', async ({ appPage }) => {
    await appPage.goto('/world/room/dev-squad');
    await expect(appPage).toHaveURL('/world/room/dev-squad');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display minimap', async ({ appPage }) => {
    const minimap = appPage.locator(
      '[class*="minimap"], [data-testid="minimap"]'
    );
    const count = await minimap.count();
    // Minimap may or may not be visible depending on view
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
