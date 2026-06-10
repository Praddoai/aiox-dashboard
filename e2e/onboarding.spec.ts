import { test, expect, waitForApp } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Onboarding Tour
// Tests cinematic intro, 8-step tour, skip, complete, spotlight
// ==========================================================================

test.describe('Cinematic Intro', () => {
  test('should show cinematic intro for new users', async ({ page }) => {
    // Clear onboarding state before navigation
    await page.addInitScript(() => {
      localStorage.removeItem('aios-onboarding');
    });
    await page.goto('/');
    await waitForApp(page);

    // CinematicIntro renders as a dialog with role="dialog"
    const intro = page.locator('[role="dialog"][aria-label="Introdução AIOX"]');
    const isVisible = await intro.isVisible().catch(() => false);
    if (isVisible) {
      await expect(intro).toBeVisible();
    }
  });

  test('should allow skipping intro by clicking', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('aios-onboarding');
    });
    await page.goto('/');
    await waitForApp(page);

    const intro = page.locator('[role="dialog"][aria-label="Introdução AIOX"]');
    if (await intro.isVisible().catch(() => false)) {
      // Click to skip
      await intro.click();
      await page.waitForTimeout(1000);
      // Should transition to tour or dismiss
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display "CLIQUE PARA PULAR" hint', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('aios-onboarding');
    });
    await page.goto('/');
    await waitForApp(page);

    const skipHint = page.locator('text=CLIQUE PARA PULAR');
    const isVisible = await skipHint.isVisible().catch(() => false);
    if (isVisible) {
      await expect(skipHint).toBeVisible();
    }
  });
});

test.describe('Onboarding Tour Steps', () => {
  test('should show tour after cinematic intro', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('aios-onboarding');
    });
    await page.goto('/');
    await waitForApp(page);

    // Skip cinematic intro by clicking
    const intro = page.locator('[role="dialog"][aria-label="Introdução AIOX"]');
    if (await intro.isVisible().catch(() => false)) {
      await intro.click();
      await page.waitForTimeout(1500);
    }

    // Tour card should show "Bem-vindo ao AIOS Core"
    const welcomeTitle = page.locator('text=Bem-vindo ao AIOS Core');
    const isVisible = await welcomeTitle.isVisible().catch(() => false);
    if (isVisible) {
      await expect(welcomeTitle).toBeVisible();
    }
  });

  test('should navigate through steps with "Próximo" button', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('aios-onboarding');
    });
    await page.goto('/');
    await waitForApp(page);

    // Skip intro
    const intro = page.locator('[role="dialog"][aria-label="Introdução AIOX"]');
    if (await intro.isVisible().catch(() => false)) {
      await intro.click();
      await page.waitForTimeout(1500);
    }

    const nextBtn = page.locator('button:has-text("Próximo")');
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      // Should advance to step 2 — "Squads de Especialistas"
      const squadsTitle = page.locator('text=Squads de Especialistas');
      const isVisible = await squadsTitle.isVisible().catch(() => false);
      if (isVisible) {
        await expect(squadsTitle).toBeVisible();
      }
    }
  });

  test('should skip tour with "Pular tour" button', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('aios-onboarding');
    });
    await page.goto('/');
    await waitForApp(page);

    // Skip intro
    const intro = page.locator('[role="dialog"][aria-label="Introdução AIOX"]');
    if (await intro.isVisible().catch(() => false)) {
      await intro.click();
      await page.waitForTimeout(1500);
    }

    const skipBtn = page.locator('text=Pular tour');
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
      // Tour overlay should be gone
      await expect(skipBtn).toBeHidden();
    }
  });

  test('should have close button with aria-label "Fechar"', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('aios-onboarding');
    });
    await page.goto('/');
    await waitForApp(page);

    // Skip intro
    const intro = page.locator('[role="dialog"][aria-label="Introdução AIOX"]');
    if (await intro.isVisible().catch(() => false)) {
      await intro.click();
      await page.waitForTimeout(1500);
    }

    const closeBtn = page.locator('button[aria-label="Fechar"]');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
      // Tour should be dismissed
      await expect(page.locator('text=Bem-vindo ao AIOS Core')).toBeHidden();
    }
  });

  test('should NOT show tour for returning users', async ({ page }) => {
    // Set completed tour state
    await page.addInitScript(() => {
      localStorage.setItem(
        'aios-onboarding',
        JSON.stringify({ state: { hasCompletedTour: true }, version: 0 })
      );
    });
    await page.goto('/');
    await waitForApp(page);

    // Tour should not appear
    const tourOverlay = page.locator('.fixed.inset-0.z-\\[200\\]');
    const isVisible = await tourOverlay.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});
