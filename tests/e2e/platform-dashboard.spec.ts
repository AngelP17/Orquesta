import { test, expect } from '@playwright/test';

test.describe('platform dashboard', () => {
  test('loads overview page', async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_DASHBOARD_URL ?? 'http://localhost:3000/');
    await expect(page.getByRole('heading', { name: /Platform Overview/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sellers/i })).toBeVisible();
  });
});
