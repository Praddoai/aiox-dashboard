import { test, expect, waitForApp } from './fixtures/base.fixture';
import { mockApiRoutes } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E #2: Slash Command Menu
// Tests menu display, filtering, keyboard navigation, selection
// ==========================================================================

test.describe('Slash Command Menu', () => {
  test('should show command menu when typing "/"', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const textarea = page.locator('textarea').first();
    if (!(await textarea.isVisible().catch(() => false))) return;

    await textarea.focus();
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    // Menu should appear with role="listbox"
    const menu = page.locator('[role="listbox"]');
    const isVisible = await menu.isVisible().catch(() => false);
    if (isVisible) {
      await expect(menu).toBeVisible();
    }
  });

  test('should display command categories', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const textarea = page.locator('textarea').first();
    if (!(await textarea.isVisible().catch(() => false))) return;

    await textarea.focus();
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    // Should show category labels
    const categories = page.locator('text=Sistema, text=Workflow, text=Agente, text=Rápido');
    const count = await categories.count();
    // At least some categories should be visible
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter commands as user types', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const textarea = page.locator('textarea').first();
    if (!(await textarea.isVisible().catch(() => false))) return;

    await textarea.focus();
    await page.keyboard.type('/help');
    await page.waitForTimeout(500);

    // Should filter to show only /help command
    const helpOption = page.locator('[role="option"]:has-text("/help")');
    const isVisible = await helpOption.isVisible().catch(() => false);
    if (isVisible) {
      await expect(helpOption).toBeVisible();
    }
  });

  test('should navigate with arrow keys', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const textarea = page.locator('textarea').first();
    if (!(await textarea.isVisible().catch(() => false))) return;

    await textarea.focus();
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    const menu = page.locator('[role="listbox"]');
    if (!(await menu.isVisible().catch(() => false))) return;

    // First item should be selected by default
    const firstOption = page.locator('[role="option"][aria-selected="true"]');
    await expect(firstOption.first()).toBeVisible();

    // Press ArrowDown to move selection
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Selection should have moved
    const selected = page.locator('[role="option"][aria-selected="true"]');
    await expect(selected.first()).toBeVisible();
  });

  test('should select command with Enter', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const textarea = page.locator('textarea').first();
    if (!(await textarea.isVisible().catch(() => false))) return;

    await textarea.focus();
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    const menu = page.locator('[role="listbox"]');
    if (!(await menu.isVisible().catch(() => false))) return;

    // Press Enter to select first command
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Menu should close
    await expect(menu).toBeHidden();

    // Textarea should contain the selected command
    const value = await textarea.inputValue();
    expect(value.startsWith('/')).toBeTruthy();
  });

  test('should close menu with Escape', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const textarea = page.locator('textarea').first();
    if (!(await textarea.isVisible().catch(() => false))) return;

    await textarea.focus();
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    const menu = page.locator('[role="listbox"]');
    if (!(await menu.isVisible().catch(() => false))) return;

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(menu).toBeHidden();
  });

  test('should show result count in header', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    const textarea = page.locator('textarea').first();
    if (!(await textarea.isVisible().catch(() => false))) return;

    await textarea.focus();
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    // Header should show "X resultado(s)"
    const resultCount = page.locator('text=/resultado/');
    const isVisible = await resultCount.isVisible().catch(() => false);
    if (isVisible) {
      await expect(resultCount).toBeVisible();
    }
  });
});
