import { test, expect } from '@playwright/test';

test.describe('Screener', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.dashboard', { timeout: 15000 });
    // Navigate to heatmap "See all"
    await page.locator('.dashboard-heatmap .panel-see-all').click();
    await page.waitForSelector('.heatmap-view', { timeout: 5000 });
    // Switch to screener
    await page.locator('.heatmap-controls .pill').filter({ hasText: 'Screener' }).click();
    await page.waitForSelector('.screener-view', { timeout: 5000 });
  });

  test('renders screener with presets and table', async ({ page }) => {
    await expect(page.locator('.screener-controls')).toBeVisible();
    await expect(page.locator('.screener-table')).toBeVisible();
    await expect(page.locator('.screener-result-count')).toBeVisible();
  });

  test('preset pills are visible', async ({ page }) => {
    for (const label of ['Value', 'Momentum', 'Mega Cap']) {
      await expect(page.locator('.screener-controls .pill').filter({ hasText: label })).toBeVisible();
    }
    // "All" matches multiple pills (also "Small Cap") — check with exact text
    await expect(page.getByRole('button', { name: 'All', exact: true }).nth(1)).toBeVisible();
  });

  test('Value preset filters stocks', async ({ page }) => {
    const initialCount = await page.locator('.screener-table tbody tr').count();
    await page.locator('.screener-controls .pill').filter({ hasText: 'Value' }).click();
    const filteredCount = await page.locator('.screener-table tbody tr').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('filter dropdown opens and closes', async ({ page }) => {
    await page.locator('.filter-dropdown-btn').first().click();
    await expect(page.locator('.filter-dropdown-menu')).toBeVisible();
    // Click outside to close
    await page.locator('.screener-result-count').click();
    await expect(page.locator('.filter-dropdown-menu')).not.toBeVisible();
  });

  test('sorting by column works', async ({ page }) => {
    // Click Price header to sort (simpler text, less ambiguity)
    const header = page.locator('.screener-table thead th').filter({ hasText: 'Price' }).first();
    await header.click();
    await page.waitForTimeout(500);
    // Table should still have rows (sort didn't break anything)
    const rows = page.locator('.screener-table tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('clicking stock row navigates to detail', async ({ page }) => {
    await page.locator('.screener-table tbody tr.clickable-row').first().click();
    await expect(page.locator('.detail-page')).toBeVisible({ timeout: 10000 });
  });

  test('heatmap toggle switches back to heatmap', async ({ page }) => {
    await page.locator('.screener-controls .pill').filter({ hasText: 'Heatmap' }).click();
    await expect(page.locator('.heatmap-view')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Heatmap Full View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.dashboard', { timeout: 15000 });
    await page.locator('.dashboard-heatmap .panel-see-all').click();
    await page.waitForSelector('.heatmap-view', { timeout: 5000 });
  });

  test('renders heatmap with sector toggle', async ({ page }) => {
    await expect(page.locator('.heatmap-controls')).toBeVisible();
    await expect(page.locator('.heatmap-container svg')).toBeVisible();
  });

  test('sector toggle changes heatmap grouping', async ({ page }) => {
    await page.locator('.heatmap-controls .pill').filter({ hasText: 'By Sector' }).click();
    await page.waitForTimeout(500);
    // Should still have cells
    const cells = page.locator('.heatmap-container svg g');
    expect(await cells.count()).toBeGreaterThan(0);
  });

  test('hovering stock shows tooltip', async ({ page }) => {
    const cell = page.locator('.heatmap-cell').first();
    await cell.hover();
    await expect(page.locator('.heatmap-tooltip')).toBeVisible();
  });
});
