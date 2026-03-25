import { test, expect } from '@playwright/test';

test.describe('Stock Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.dashboard-heatmap-container svg g', { timeout: 30000 });
    // Click a stock in the heatmap
    await page.locator('.dashboard-heatmap-container svg g').first().click();
    await page.waitForSelector('.detail-page', { timeout: 15000 });
    // Wait for detail data to fully load
    await page.waitForSelector('.detail-header', { timeout: 15000 });
  });

  test('renders stock detail with header', async ({ page }) => {
    await expect(page.locator('.detail-header')).toBeVisible();
    await expect(page.locator('.detail-price-block')).toBeVisible();
  });

  test('shows back button that returns to dashboard', async ({ page }) => {
    await expect(page.locator('.detail-back')).toBeVisible();
    await page.locator('.detail-back').click();
    await expect(page.locator('.dashboard')).toBeVisible();
  });

  test('shows compare button', async ({ page }) => {
    await expect(page.locator('.detail-compare-btn')).toBeVisible();
  });

  test('renders chart with time range pills', async ({ page }) => {
    await page.waitForSelector('.stock-chart', { timeout: 15000 });
    await expect(page.locator('.stock-chart')).toBeVisible();
    await expect(page.locator('.chart-range-pills')).toBeVisible();
  });

  test('renders key statistics table', async ({ page }) => {
    await page.waitForSelector('.detail-stats-table', { timeout: 15000 });
    await expect(page.locator('.detail-stats-table')).toBeVisible();
    const rows = page.locator('.detail-stats-table tbody tr');
    expect(await rows.count()).toBeGreaterThan(5);
  });

  test('metric tooltips show on hover', async ({ page }) => {
    const trigger = page.locator('.metric-tooltip-trigger').first();
    await trigger.hover();
    await expect(page.locator('.metric-tooltip-popup')).toBeVisible();
  });

  test('compare button navigates to compare view', async ({ page }) => {
    const symbol = await page.locator('.detail-symbol').textContent();
    await page.locator('.detail-compare-btn').click();
    await expect(page.locator('.compare-view')).toBeVisible({ timeout: 5000 });
    // The stock should be pre-loaded
    if (symbol) {
      await expect(page.locator('.compare-view').getByText(symbol.trim())).toBeVisible({ timeout: 10000 });
    }
  });
});
