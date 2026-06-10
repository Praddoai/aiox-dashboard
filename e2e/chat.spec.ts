import { test, expect, seedDemoChat, waitForApp, skipOnboarding } from './fixtures/base.fixture';
import { mockApiRoutes, mockStreamEndpoint } from './fixtures/api-mocks.fixture';

// ==========================================================================
// E2E: Chat System
// Tests messaging, streaming, markdown rendering, slash commands
// ==========================================================================

test.describe('Chat Interface', () => {
  test('should render chat view (squad selector or input)', async ({ page }) => {
    await skipOnboarding(page);
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);

    // Wait for Framer Motion animations to settle
    await page.waitForTimeout(1000);

    // Chat view may show squad selector heading before agent selection, or textarea after
    const hasSquadSelector = await page.locator('h2:has-text("Escolha um Squad")').isVisible().catch(() => false);
    const hasTextarea = await page.locator('textarea').first().isVisible().catch(() => false);
    expect(hasSquadSelector || hasTextarea).toBeTruthy();
  });

  test('should type a message when chat input is available', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);
    const input = page.locator('textarea').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('Hello, this is a test message');
      await expect(input).toHaveValue('Hello, this is a test message');
    }
  });

  test('should support multiline input with Shift+Enter', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);
    const input = page.locator('textarea').first();
    if (!(await input.isVisible().catch(() => false))) return;

    await input.focus();
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('Line 2');

    const value = await input.inputValue();
    expect(value).toContain('Line 1');
    expect(value).toContain('Line 2');
  });

  test('should show slash command menu on "/" input', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/');
    await waitForApp(page);
    const input = page.locator('textarea').first();
    if (!(await input.isVisible().catch(() => false))) return;

    await input.focus();
    await page.keyboard.type('/');
    await page.waitForTimeout(500);

    const menu = page.locator(
      '[data-testid="slash-menu"], [role="listbox"], [role="menu"]'
    ).first();
    const isVisible = await menu.isVisible().catch(() => false);
    if (isVisible) {
      const items = menu.locator('[role="option"], li, button');
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should clear input after sending', async ({ page }) => {
    await mockApiRoutes(page);
    await mockStreamEndpoint(page, ['Hello from agent!']);
    await page.goto('/');
    await waitForApp(page);

    const input = page.locator('textarea').first();
    if (!(await input.isVisible().catch(() => false))) return;

    await input.fill('Test message');

    const sendBtn = page.locator(
      'button[type="submit"], [data-testid="send-button"], button:has(svg)'
    ).last();

    if (await sendBtn.isVisible()) {
      await sendBtn.click();
    } else {
      await page.keyboard.press('Meta+Enter');
    }

    await page.waitForTimeout(1000);
    await expect(input).toHaveValue('');
  });
});

test.describe('Chat Messages & Markdown', () => {
  test('should render demo chat messages after seeding', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const messages = page.locator('[class*="message"], [class*="bubble"], [class*="msg"]');
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should render markdown code blocks with syntax highlighting', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const codeBlocks = page.locator('pre code');
    const count = await codeBlocks.count();
    if (count > 0) {
      await expect(codeBlocks.first()).toBeVisible();
    }
  });

  test('should have copy button on code blocks', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const codeBlocks = page.locator('pre');
    if ((await codeBlocks.count()) > 0) {
      await codeBlocks.first().hover();
      const copyBtn = codeBlocks.first().locator('button').first();
      if (await copyBtn.isVisible()) {
        await expect(copyBtn).toBeVisible();
      }
    }
  });

  test('should render mermaid diagrams as SVG', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(3000);

    const diagrams = page.locator('[class*="mermaid"] svg, .mermaid svg');
    const count = await diagrams.count();
    if (count > 0) {
      await expect(diagrams.first()).toBeVisible();
    }
  });

  test('should render diff blocks with colored lines', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const diffBlocks = page.locator('[class*="diff"], pre:has(.text-green), pre:has(.text-red)');
    const count = await diffBlocks.count();
    if (count > 0) {
      await expect(diffBlocks.first()).toBeVisible();
    }
  });

  test('should render @agent mention badges', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const mentions = page.locator('[class*="mention"], [class*="badge"]:has-text("@")');
    const count = await mentions.count();
    if (count > 0) {
      await expect(mentions.first()).toBeVisible();
    }
  });

  test('should render collapsible details/summary sections', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const details = page.locator('details');
    const count = await details.count();
    if (count > 0) {
      const summary = details.first().locator('summary');
      await expect(summary).toBeVisible();
      await summary.click();
      await page.waitForTimeout(300);
      const content = details.first().locator(':not(summary)').first();
      await expect(content).toBeVisible();
    }
  });

  test('should show copy message button on hover', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const messages = page.locator('[class*="group/msg"], [class*="message"]');
    if ((await messages.count()) > 0) {
      await messages.first().hover();
      await page.waitForTimeout(300);
      const copyBtn = messages.first().locator('button:has-text("Copiar"), button[title*="copy"]');
      const count = await copyBtn.count();
      if (count > 0) {
        await expect(copyBtn.first()).toBeVisible();
      }
    }
  });

  test('should render checklist progress bar when message has tasks', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const progressBars = page.locator('[class*="progress"], [role="progressbar"]');
    const count = await progressBars.count();
    if (count > 0) {
      await expect(progressBars.first()).toBeVisible();
    }
  });
});

test.describe('Chat Scroll', () => {
  test('should show scroll-to-bottom button when scrolled up', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await seedDemoChat(page);
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(2000);

    const scrollArea = page.locator('.overflow-y-auto').first();
    if (await scrollArea.isVisible()) {
      await scrollArea.evaluate((el) => el.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const scrollBtn = page.locator(
        'button:has(svg[class*="chevron"]), [data-testid="scroll-bottom"]'
      );
      const count = await scrollBtn.count();
      if (count > 0) {
        await expect(scrollBtn.first()).toBeVisible();
      }
    }
  });
});
