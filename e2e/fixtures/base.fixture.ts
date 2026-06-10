import { test as base, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helpers available to every E2E test via `test.use()`
// ---------------------------------------------------------------------------

/** Seed demo chat data via the exposed window helper */
async function seedDemoChat(page: Page) {
  await page.evaluate(() => {
    if (typeof (window as Record<string, unknown>).__seedDemoChat === 'function') {
      (window as Record<string, unknown>).__seedDemoChat();
    }
  });
}

/** Wait for the Vite app to be fully hydrated */
async function waitForApp(page: Page) {
  // Wait for React to mount — look for root div with content
  await page.waitForSelector('#root:not(:empty)', {
    timeout: 30_000,
  });
  // Small delay for lazy-loaded views to render
  await page.waitForTimeout(500);

  // Dismiss onboarding cinematic intro if visible (clicks anywhere to skip)
  const intro = page.locator('[role="dialog"][aria-label="Introdução AIOX"]');
  if (await intro.isVisible().catch(() => false)) {
    await intro.click();
    await page.waitForTimeout(800);
  }

  // Dismiss onboarding tour if visible (skip tour)
  const skipTour = page.locator('text=Pular tour');
  if (await skipTour.isVisible().catch(() => false)) {
    await skipTour.click();
    await page.waitForTimeout(300);
  }
}

/** Mark onboarding as completed to skip cinematic intro in tests */
async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'aios-onboarding',
      JSON.stringify({ state: { hasCompletedTour: true }, version: 0 })
    );
  });
}

/** Navigate to a specific view via URL */
async function navigateToView(page: Page, view: string) {
  const path = view === 'chat' ? '/' : `/${view}`;
  await page.goto(path);
  await waitForApp(page);
}

/** Clear persisted Zustand stores (localStorage) */
async function clearStores(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/** Set a specific theme */
async function setTheme(page: Page, theme: string) {
  await page.evaluate((t) => {
    const store = JSON.parse(localStorage.getItem('aios-ui-store') || '{}');
    store.state = { ...store.state, theme: t };
    localStorage.setItem('aios-ui-store', JSON.stringify(store));
  }, theme);
  await page.reload();
  await waitForApp(page);
}

// ---------------------------------------------------------------------------
// Extended test fixture
// ---------------------------------------------------------------------------

interface AiosFixtures {
  /** Navigates and waits for the app to be ready */
  appPage: Page;
}

export const test = base.extend<AiosFixtures>({
  appPage: async ({ page }, use) => {
    await page.goto('/');
    await waitForApp(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect, seedDemoChat, waitForApp, navigateToView, clearStores, setTheme, skipOnboarding };
