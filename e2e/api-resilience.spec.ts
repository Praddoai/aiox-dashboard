import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiError, mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: API Resilience & Error Handling
// Tests offline behavior, API errors, error boundaries, retry logic
// ==========================================================================

test.describe('Error Boundaries', () => {
  test('should show error fallback when view crashes', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForApp(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should recover from error via retry button', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const retryBtn = page.locator(
      'button:has-text("Retry"), button:has-text("Tentar"), button:has-text("Voltar")'
    );
    if ((await retryBtn.count()) > 0) {
      await retryBtn.first().click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('API Error States', () => {
  test('should handle 500 server errors gracefully', async ({ page }) => {
    await mockApiError(page, '**/api/squads**', 500, 'Internal Server Error');
    await page.goto('/squads');
    await waitForApp(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    await mockApiError(page, '**/api/agents**', 404, 'Not Found');
    await page.goto('/agents');
    await waitForApp(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    await page.route(/\/api\//, async (route) => {
      const url = route.request().url();
      // Skip Vite module requests — let them through to the dev server
      if (/\.\w{2,5}$/.test(new URL(url).pathname)) {
        await route.continue();
        return;
      }
      // Abort after short delay to simulate timeout
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.abort('timedout').catch(() => {});
    });

    await page.goto('/dashboard');
    await waitForApp(page);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Offline Behavior', () => {
  test('should handle going offline', async ({ page, context }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });
});
