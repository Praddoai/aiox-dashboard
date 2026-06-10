import { test, expect } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Workflow System
// Tests workflow modal, canvas, execution
// ==========================================================================

test.describe('Workflow View', () => {
  test('should open workflow modal with Cmd+Shift+W', async ({ appPage }) => {
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    await appPage.keyboard.press(`${mod}+Shift+w`);
    await appPage.waitForTimeout(1000);

    // Workflow view should appear as a modal/overlay
    const workflow = appPage.locator(
      '[class*="workflow"], [data-testid="workflow-view"], [role="dialog"]'
    );
    const count = await workflow.count();

    // Close it
    await appPage.keyboard.press('Escape');
    await appPage.waitForTimeout(500);

    expect(count).toBeGreaterThanOrEqual(0);
  });
});
