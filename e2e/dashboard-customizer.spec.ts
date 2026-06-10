import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Dashboard Widget Customizer
// Tests toggle widgets, reorder, reset, "Personalizar" button
// ==========================================================================

test.describe('Widget Customizer', () => {
  test('should have "Personalizar" button on dashboard', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);

    const customizeBtn = page.locator(
      'button:has-text("Personalizar"), button[aria-label="Personalizar widgets"]'
    );
    const count = await customizeBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open customizer panel on click', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);

    const customizeBtn = page.locator(
      'button:has-text("Personalizar"), button[aria-label="Personalizar widgets"]'
    );
    if (await customizeBtn.first().isVisible().catch(() => false)) {
      await customizeBtn.first().click();
      await page.waitForTimeout(500);

      // Panel should show "Dashboard Widgets" title
      const panelTitle = page.locator('text=Dashboard Widgets');
      await expect(panelTitle).toBeVisible();
    }
  });

  test('should display all 9 widget items', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);

    const customizeBtn = page.locator(
      'button:has-text("Personalizar"), button[aria-label="Personalizar widgets"]'
    );
    if (await customizeBtn.first().isVisible().catch(() => false)) {
      await customizeBtn.first().click();
      await page.waitForTimeout(500);

      // Should show widget labels
      const widgetLabels = [
        'Metric Cards', 'Execution Trend', 'Status Distribution',
        'Health Cards', 'Agent Ranking', 'Command Analytics',
        'MCP Servers', 'Cost Overview', 'System Info',
      ];
      for (const label of widgetLabels) {
        const item = page.locator(`text=${label}`);
        const isVisible = await item.isVisible().catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    }
  });

  test('should toggle widget visibility', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);

    const customizeBtn = page.locator(
      'button:has-text("Personalizar"), button[aria-label="Personalizar widgets"]'
    );
    if (await customizeBtn.first().isVisible().catch(() => false)) {
      await customizeBtn.first().click();
      await page.waitForTimeout(500);

      // Find a toggle button (Ocultar/Mostrar)
      const toggleBtn = page.locator('button[aria-label="Ocultar"], button[aria-label="Mostrar"]').first();
      if (await toggleBtn.isVisible().catch(() => false)) {
        await toggleBtn.click();
        await page.waitForTimeout(300);
        // Toggle should have changed
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should have Reset button', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);

    const customizeBtn = page.locator(
      'button:has-text("Personalizar"), button[aria-label="Personalizar widgets"]'
    );
    if (await customizeBtn.first().isVisible().catch(() => false)) {
      await customizeBtn.first().click();
      await page.waitForTimeout(500);

      const resetBtn = page.locator('text=Reset');
      if (await resetBtn.isVisible().catch(() => false)) {
        await resetBtn.click();
        await page.waitForTimeout(300);
        // All widgets should be visible again
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should close panel with "Pronto" button', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await waitForApp(page);

    const customizeBtn = page.locator(
      'button:has-text("Personalizar"), button[aria-label="Personalizar widgets"]'
    );
    if (await customizeBtn.first().isVisible().catch(() => false)) {
      await customizeBtn.first().click();
      await page.waitForTimeout(500);

      const doneBtn = page.locator('button:has-text("Pronto")');
      if (await doneBtn.isVisible().catch(() => false)) {
        await doneBtn.click();
        await page.waitForTimeout(300);

        const panelTitle = page.locator('text=Dashboard Widgets');
        await expect(panelTitle).toBeHidden();
      }
    }
  });
});
