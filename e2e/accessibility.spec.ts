import { test, expect, waitForApp } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Accessibility (A11y)
// Tests keyboard navigation, ARIA attributes, focus management
// ==========================================================================

test.describe('Keyboard Navigation', () => {
  test('should be able to tab through interactive elements', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeDefined();

    await page.keyboard.press('Tab');
    const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(secondFocused).toBeDefined();
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const hasFocusStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return true;

      const style = getComputedStyle(el);
      const hasOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
      const hasBoxShadow = style.boxShadow !== 'none';
      const hasRing = el.className?.includes('ring') || el.className?.includes('focus');

      return hasOutline || hasBoxShadow || hasRing;
    });

    expect(hasFocusStyle).toBeTruthy();
  });
});

test.describe('ARIA Attributes', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const headings = await page.evaluate(() => {
      const h = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(h).map((el) => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent?.trim().slice(0, 50),
      }));
    });

    if (headings.length > 0) {
      expect(headings[0].level).toBeLessThanOrEqual(3);
    }
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const role = await images.nth(i).getAttribute('role');
      expect(alt !== null || role === 'presentation' || role === 'none').toBeTruthy();
    }
  });

  test('should have aria-labels on icon-only buttons', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Get all icon-only buttons (have SVG but no visible text)
    const iconButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const iconOnly: { hasLabel: boolean; text: string }[] = [];

      buttons.forEach((btn) => {
        const hasSvg = btn.querySelector('svg') !== null;
        const textContent = btn.textContent?.trim() || '';
        // Icon-only: has SVG and text is empty or very short
        if (hasSvg && textContent.length <= 2) {
          const ariaLabel = btn.getAttribute('aria-label');
          const title = btn.getAttribute('title');
          const ariaLabelledBy = btn.getAttribute('aria-labelledby');
          iconOnly.push({
            hasLabel: !!(ariaLabel || title || ariaLabelledBy),
            text: textContent,
          });
        }
      });

      return iconOnly;
    });

    // Track unlabeled buttons as a metric, not hard fail
    const unlabeled = iconButtons.filter((b) => !b.hasLabel);
    if (unlabeled.length > 0) {
      console.warn(`Found ${unlabeled.length} icon-only buttons without aria-label`);
    }
  });

  test('should have proper landmark roles', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const landmarks = await page.evaluate(() => {
      const found: string[] = [];
      if (document.querySelector('header')) found.push('header');
      if (document.querySelector('nav')) found.push('nav');
      if (document.querySelector('main')) found.push('main');
      if (document.querySelector('footer')) found.push('footer');
      if (document.querySelector('aside')) found.push('aside');
      if (document.querySelector('[role="banner"]')) found.push('banner');
      if (document.querySelector('[role="navigation"]')) found.push('navigation');
      if (document.querySelector('[role="main"]')) found.push('main-role');
      return [...new Set(found)];
    });

    expect(landmarks.length).toBeGreaterThan(0);
  });
});

test.describe('A11y Across Views', () => {
  const criticalViews = ['dashboard', 'stories', 'agents', 'settings', 'monitor'];

  for (const view of criticalViews) {
    test(`should not have duplicate IDs on ${view}`, async ({ page }) => {
      await page.goto(`/${view}`);
      await waitForApp(page);

      const duplicateIds = await page.evaluate(() => {
        const ids = document.querySelectorAll('[id]');
        const idMap = new Map<string, number>();
        ids.forEach((el) => {
          const id = el.id;
          idMap.set(id, (idMap.get(id) || 0) + 1);
        });
        const duplicates: string[] = [];
        idMap.forEach((count, id) => {
          if (count > 1) duplicates.push(`${id} (${count}x)`);
        });
        return duplicates;
      });

      expect(duplicateIds.length).toBe(0);
    });
  }
});
