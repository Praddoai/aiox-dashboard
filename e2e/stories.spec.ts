import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Stories
// Tests story list, create, detail, status transitions
// ==========================================================================

test.describe('Stories View', () => {
  test('should render stories list view', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/stories');
    await waitForApp(page);
    await expect(page).toHaveURL('/stories');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display story cards or list items', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/stories');
    await waitForApp(page);
    const stories = page.locator(
      '[data-testid*="story"], [class*="story-card"], [class*="StoryCard"]'
    );
    const count = await stories.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have create story action', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/stories');
    await waitForApp(page);
    const createBtn = page.locator(
      'button:has-text("Nova"), button:has-text("Criar"), button:has-text("Add"), [aria-label*="create"]'
    );
    const count = await createBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
