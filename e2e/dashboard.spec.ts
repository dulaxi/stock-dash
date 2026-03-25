import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for data to load — Yahoo API can be slow on first fetch
    await page.waitForSelector('.dashboard', { timeout: 30000 });
    // Wait for quotes to populate heatmap
    await page.waitForSelector('.dashboard-heatmap-container svg g', { timeout: 30000 });
  });

  test('renders header bar with logo and controls', async ({ page }) => {
    await expect(page.locator('.header-bar-logo')).toHaveText('XTOX');
    await expect(page.locator('.header-bar .pill-group').first()).toBeVisible();
    await expect(page.locator('.status-dot')).toBeVisible();
  });

  test('renders index strip with market indices', async ({ page }) => {
    await expect(page.locator('.index-strip')).toBeVisible();
    const items = page.locator('.index-strip-item');
    await expect(items).toHaveCount(3);
  });

  test('renders sector strip', async ({ page }) => {
    await page.waitForSelector('.sector-strip', { timeout: 10000 });
    const sectors = page.locator('.sector-strip-item');
    expect(await sectors.count()).toBeGreaterThan(0);
  });

  test('renders heatmap with stock cells', async ({ page }) => {
    await page.waitForSelector('.dashboard-heatmap-container svg', { timeout: 10000 });
    const cells = page.locator('.dashboard-heatmap-container svg g');
    expect(await cells.count()).toBeGreaterThan(0);
  });

  test('renders watchlist panel', async ({ page }) => {
    await expect(page.locator('.dashboard-watchlist')).toBeVisible();
    await expect(page.locator('.panel-title').filter({ hasText: 'WATCHLIST' })).toBeVisible();
  });

  test('renders top movers panel with gainers and losers', async ({ page }) => {
    await expect(page.locator('.dashboard-movers')).toBeVisible();
    await expect(page.locator('.movers-label').filter({ hasText: 'GAINERS' })).toBeVisible();
    await expect(page.locator('.movers-label').filter({ hasText: 'LOSERS' })).toBeVisible();
  });

  test('renders news strip', async ({ page }) => {
    await page.waitForSelector('.news-strip', { timeout: 10000 });
    await expect(page.locator('.news-strip')).toBeVisible();
  });

  test('market switcher changes data', async ({ page }) => {
    // Click NDQ pill
    await page.locator('.header-bar .pill').filter({ hasText: 'NDQ' }).click();
    // Wait for data refresh
    await page.waitForTimeout(2000);
    // Heatmap should still have cells
    const cells = page.locator('.dashboard-heatmap-container svg g');
    expect(await cells.count()).toBeGreaterThan(0);
  });

  test('theme toggle switches theme', async ({ page }) => {
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await page.locator('.icon-pill').click();
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('clicking XTOX logo from any view returns to dashboard', async ({ page }) => {
    // Navigate away via "See all" on movers
    await page.locator('.panel-see-all').filter({ hasText: 'See all' }).first().click();
    await page.waitForTimeout(500);
    // Click logo
    await page.locator('.header-bar-logo').click();
    await expect(page.locator('.dashboard')).toBeVisible();
  });
});

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.dashboard', { timeout: 15000 });
  });

  test('search expands on click and shows results', async ({ page }) => {
    await page.locator('.header-bar-search-btn').click();
    const input = page.locator('.header-bar-search input');
    await expect(input).toBeVisible();
    await input.fill('AAPL');
    await page.waitForSelector('.header-bar-search-results', { timeout: 5000 });
    await expect(page.locator('.search-item').first()).toBeVisible();
  });

  test('clicking search result navigates to stock detail', async ({ page }) => {
    await page.locator('.header-bar-search-btn').click();
    await page.locator('.header-bar-search input').fill('AAPL');
    await page.waitForSelector('.header-bar-search-results', { timeout: 5000 });
    await page.locator('.search-item').first().click();
    await expect(page.locator('.detail-page')).toBeVisible({ timeout: 10000 });
  });
});
