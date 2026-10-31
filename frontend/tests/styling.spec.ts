import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/overview', name: 'Overview' },
  { path: '/forecast', name: 'Forecast' },
  { path: '/energy-flow', name: 'Energy Flow' },
  { path: '/scenario', name: 'Scenario' },
  { path: '/backtest', name: 'Backtest' },
  { path: '/savings', name: 'Savings' },
  { path: '/method', name: 'Method & Limits' },
];

for (const pageInfo of PAGES) {
  test.describe(`Styling and Font Audit: ${pageInfo.name} (${pageInfo.path})`, () => {
    test('container has at least 16px of side padding at 360px viewport', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });

      // Check container side padding
      const container = page.locator('.container').first();
      await expect(container).toBeVisible();

      const paddingLeft = await container.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).paddingLeft);
      });
      const paddingRight = await container.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).paddingRight);
      });

      expect(paddingLeft).toBeGreaterThanOrEqual(16);
      expect(paddingRight).toBeGreaterThanOrEqual(16);
    });

    test('computed font family of body text is the app font', async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });

      const bodyFont = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily.toLowerCase();
      });

      // App font is IBM Plex Sans
      expect(bodyFont).toContain('ibm plex sans');
      expect(bodyFont).not.toContain('times');
    });

    test('no heading, button, input or select uses browser default font', async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });

      // Check headings (h1, h2, h3, h4)
      const headings = await page.$$eval('h1, h2, h3, h4', (els) =>
        els.map((el) => window.getComputedStyle(el).fontFamily.toLowerCase())
      );
      for (const font of headings) {
        const isAppFont = font.includes('ibm plex sans') || font.includes('ibm plex mono');
        expect(isAppFont).toBe(true);
        expect(font).not.toContain('times');
      }

      // Check buttons (buttons may use sans or mono for code/id chips)
      const buttons = await page.$$eval('button', (els) =>
        els.map((el) => window.getComputedStyle(el).fontFamily.toLowerCase())
      );
      for (const font of buttons) {
        const isAppFont = font.includes('ibm plex sans') || font.includes('ibm plex mono');
        expect(isAppFont).toBe(true);
        expect(font).not.toContain('times');
      }

      // Check inputs and selects
      const inputs = await page.$$eval('input, select', (els) =>
        els.map((el) => window.getComputedStyle(el).fontFamily.toLowerCase())
      );
      for (const font of inputs) {
        const isAppFont = font.includes('ibm plex sans') || font.includes('ibm plex mono');
        expect(isAppFont).toBe(true);
        expect(font).not.toContain('times');
      }
    });
  });
}
