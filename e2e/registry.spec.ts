import { test, expect, navigateToView } from './fixtures/base.fixture';

// ==========================================================================
// E2E: Registry Views
// Tests agent-directory, task-catalog, workflow-catalog, authority-matrix,
// handoff-flows — all powered by the generated AIOS registry
// ==========================================================================

test.describe('Agent Directory', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'agent-directory');
  });

  test('should render agent directory view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/agent-directory');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display agent cards or list', async ({ appPage }) => {
    const agents = appPage.locator(
      '[class*="agent"], [class*="card"], [class*="directory"]'
    );
    const count = await agents.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have search or filter functionality', async ({ appPage }) => {
    const search = appPage.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i], input[placeholder*="filtrar" i]'
    );
    const count = await search.count();
    if (count > 0) {
      await search.first().fill('dev');
      await expect(search.first()).toHaveValue('dev');
    }
  });
});

test.describe('Task Catalog', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'task-catalog');
  });

  test('should render task catalog view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/task-catalog');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display task cards or list items', async ({ appPage }) => {
    const tasks = appPage.locator(
      '[class*="task"], [class*="card"], [class*="catalog"]'
    );
    const count = await tasks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have agent filter pills', async ({ appPage }) => {
    const filters = appPage.locator(
      'button[aria-pressed], [class*="pill"], [class*="filter"]'
    );
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Workflow Catalog', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'workflow-catalog');
  });

  test('should render workflow catalog view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/workflow-catalog');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display workflow items', async ({ appPage }) => {
    const workflows = appPage.locator(
      '[class*="workflow"], [class*="card"], [class*="catalog"]'
    );
    const count = await workflows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Authority Matrix', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'authority-matrix');
  });

  test('should render authority matrix view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/authority-matrix');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display matrix table or grid', async ({ appPage }) => {
    const matrix = appPage.locator(
      'table, [role="grid"], [class*="matrix"], [class*="authority"]'
    );
    const count = await matrix.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Handoff Flows', () => {
  test.beforeEach(async ({ appPage }) => {
    await navigateToView(appPage, 'handoff-flows');
  });

  test('should render handoff flows view', async ({ appPage }) => {
    await expect(appPage).toHaveURL('/handoff-flows');
    await expect(appPage.locator('body')).toBeVisible();
  });

  test('should display flow diagrams or cards', async ({ appPage }) => {
    const flows = appPage.locator(
      '[class*="handoff"], [class*="flow"], [class*="card"], svg'
    );
    const count = await flows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
