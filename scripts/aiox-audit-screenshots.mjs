import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = join(__dirname, '..', 'audit-screenshots');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const VIEWS = [
  'chat', 'dashboard', 'cockpit', 'world', 'kanban', 'agents',
  'bob', 'terminals', 'monitor', 'insights', 'context', 'knowledge',
  'roadmap', 'squads', 'stories', 'settings',
];

const LABEL_MAP = {
  chat: 'Chat', dashboard: 'Dashboard', cockpit: 'Cockpit',
  world: 'World', kanban: 'Kanban', agents: 'Agents',
  bob: 'Bob', terminals: 'Terminals', monitor: 'Monitor',
  insights: 'Insights', context: 'Context', knowledge: 'Knowledge',
  roadmap: 'Roadmap', squads: 'Squads', stories: 'Stories',
  settings: 'Settings',
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // First visit to set localStorage
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(500);

  // Set all stores to skip onboarding/intro and set aiox theme
  await page.evaluate(() => {
    // Skip onboarding tour — the store key is 'aios-onboarding', state field is 'hasCompletedTour'
    localStorage.setItem('aios-onboarding', JSON.stringify({
      state: { hasCompletedTour: true },
      version: 0
    }));

    // Set theme to aiox
    const uiKey = 'aios-ui-store';
    const stored = localStorage.getItem(uiKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state) {
          parsed.state.theme = 'aiox';
        }
        localStorage.setItem(uiKey, JSON.stringify(parsed));
      } catch {}
    } else {
      localStorage.setItem(uiKey, JSON.stringify({
        state: { theme: 'aiox', sidebarCollapsed: false, currentView: 'chat', activityPanelOpen: false },
        version: 0
      }));
    }
  });

  // Reload to apply stores
  await page.reload();
  await page.waitForTimeout(3000);

  // Force theme attribute
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'aiox');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);

  // Capture each view
  for (const viewId of VIEWS) {
    console.log(`Capturing: ${viewId}`);

    // Click the sidebar button matching this view
    const label = LABEL_MAP[viewId];
    try {
      // Use Playwright's text locator to find the nav button
      const btn = page.locator(`button:has(span:text-is("${label}"))`).first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click({ force: true });
      } else {
        // Fallback: find by partial text
        const fallback = page.getByText(label, { exact: true }).first();
        await fallback.click({ force: true, timeout: 1000 }).catch(() => {
          console.log(`  Warning: Could not click ${label}`);
        });
      }
    } catch (e) {
      console.log(`  Warning: ${e.message?.substring(0, 80)}`);
    }

    await page.waitForTimeout(1500);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${viewId}.png`),
      fullPage: false
    });
    console.log(`  Saved: ${viewId}.png`);
  }

  await browser.close();
  console.log(`\nDone! ${VIEWS.length} screenshots in: ${SCREENSHOT_DIR}`);
}

run().catch(console.error);
