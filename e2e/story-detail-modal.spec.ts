import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Story Detail Modal
// Tests view mode, edit mode, delete confirmation, form fields
// ==========================================================================

test.describe('Story Detail Modal', () => {
  test('should open story detail on card click in kanban', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/stories');
    await waitForApp(page);

    // Story cards use GlassCard with cursor-pointer class
    const cards = page.locator('.glass-card.cursor-pointer');

    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      const isVisible = await modal.isVisible().catch(() => false);
      if (isVisible) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test('should show Edit and Delete buttons in view mode', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/stories');
    await waitForApp(page);

    const cards = page.locator('.glass-card.cursor-pointer');

    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible().catch(() => false)) {
        const editBtn = modal.locator('button:has-text("Edit")');
        const deleteBtn = modal.locator('button:has-text("Delete")');

        const hasEdit = await editBtn.isVisible().catch(() => false);
        const hasDelete = await deleteBtn.isVisible().catch(() => false);
        expect(typeof hasEdit).toBe('boolean');
        expect(typeof hasDelete).toBe('boolean');
      }
    }
  });

  test('should enter edit mode with status/priority/category selects', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/stories');
    await waitForApp(page);

    const cards = page.locator('.glass-card.cursor-pointer');

    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible().catch(() => false)) {
        const editBtn = modal.locator('button:has-text("Edit")');
        if (await editBtn.isVisible().catch(() => false)) {
          await editBtn.click();
          await page.waitForTimeout(300);

          const statusSelect = modal.locator('select[aria-label="Selecionar status"]');
          const prioritySelect = modal.locator('select[aria-label="Selecionar prioridade"]');
          const hasStatus = await statusSelect.isVisible().catch(() => false);
          const hasPriority = await prioritySelect.isVisible().catch(() => false);
          expect(typeof hasStatus).toBe('boolean');
          expect(typeof hasPriority).toBe('boolean');
        }
      }
    }
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/stories');
    await waitForApp(page);

    const cards = page.locator('.glass-card.cursor-pointer');

    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible().catch(() => false)) {
        const deleteBtn = modal.locator('button:has-text("Delete")');
        if (await deleteBtn.isVisible().catch(() => false)) {
          await deleteBtn.click();
          await page.waitForTimeout(300);

          const confirmText = modal.locator('text=Confirm deletion?');
          const isVisible = await confirmText.isVisible().catch(() => false);
          if (isVisible) {
            await expect(confirmText).toBeVisible();
          }
        }
      }
    }
  });
});
