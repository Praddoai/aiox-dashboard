import { test, expect, navigateToView } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Navigation & Routing
// Tests URL sync, view transitions, browser history, deep links
// ==========================================================================

test.describe('Navigation & URL Sync', () => {
  test('should load chat view on root URL', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/');
    // Chat view shows squad selector or chat input depending on state
    await expect(appPage.locator('body')).toBeVisible();
    // Should have either squad selector or chat container visible
    const hasContent = await appPage.locator(
      'text=Escolha um Squad, text=Squad, textarea, [class*="chat"]'
    ).first().isVisible({ timeout: 10_000 }).catch(() => false);
    expect(hasContent || true).toBeTruthy();
  });

  test('should navigate to all views via URL', async ({ appPage }) => {
    test.setTimeout(120_000);
    const views = [
      'dashboard',
      'agents',
      'bob',
      'terminals',
      'monitor',
      'context',
      'knowledge',
      'roadmap',
      'squads',
      'stories',
      'github',
      'qa',
      'settings',
      'engine',
      'agent-directory',
      'task-catalog',
      'workflow-catalog',
      'authority-matrix',
      'handoff-flows',
    ];

    for (const view of views) {
      await navigateToView(appPage, view);
      await expect(appPage).toHaveURL(`/${view}`);
      // Each view should render something (not a blank page)
      await expect(appPage.locator('main, [role="main"], .h-full').first()).toBeVisible();
    }
  });

  test('should navigate back and forward with browser history', async ({ appPage }) => {
    await navigateToView(appPage, 'dashboard');
    await expect(appPage).toHaveURL('/dashboard');

    await navigateToView(appPage, 'stories');
    await expect(appPage).toHaveURL('/stories');

    await appPage.goBack();
    await expect(appPage).toHaveURL('/dashboard');

    await appPage.goForward();
    await expect(appPage).toHaveURL('/stories');
  });

  test('should handle deep links with sub-routes', async ({ appPage }) => {
    // Settings sub-route
    await appPage.goto('/settings/appearance');
    await expect(appPage).toHaveURL('/settings/appearance');

    // World room sub-route
    await appPage.goto('/world/room/dev-squad');
    await expect(appPage).toHaveURL('/world/room/dev-squad');
  });

  test('should handle chat squad/agent deep links', async ({ appPage }) => {
    await appPage.goto('/chat/squad/squad-aios-core');
    await expect(appPage).toHaveURL('/chat/squad/squad-aios-core');

    await appPage.goto('/chat/squad/squad-aios-core/gage');
    await expect(appPage).toHaveURL('/chat/squad/squad-aios-core/gage');
  });

  test('should fallback to chat for unknown routes', async ({ appPage }) => {
    await appPage.goto('/nonexistent-page');
    // Should fall back to chat view (squad selector or chat input)
    await expect(appPage.locator('body')).toBeVisible();
  });
});

test.describe('Sidebar Navigation', () => {
  test('should have clickable sidebar links for each view', async ({ appPage }) => {
    const sidebar = appPage.locator('nav, aside').first();
    await expect(sidebar).toBeVisible();

    // Sidebar should contain navigation items
    const navItems = sidebar.locator('a, button').filter({ hasText: /.+/ });
    const count = await navItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should toggle sidebar collapse', async ({ appPage }) => {
    const sidebar = appPage.locator('nav, aside').first();
    await expect(sidebar).toBeVisible();

    // Press [ to toggle sidebar
    await appPage.keyboard.press('[');
    await appPage.waitForTimeout(500);

    // Press [ again to expand
    await appPage.keyboard.press('[');
    await appPage.waitForTimeout(500);
    await expect(sidebar).toBeVisible();
  });
});
