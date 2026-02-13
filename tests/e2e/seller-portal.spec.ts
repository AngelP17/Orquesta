import { test, expect } from '@playwright/test';

test.describe('seller portal', () => {
  test('loads overview and supports locale toggle', async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_PORTAL_URL ?? 'http://localhost:3001/');
    await expect(page.getByRole('heading', { name: /Resumen|Overview/i })).toBeVisible();
    await page.getByRole('button', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { name: /Overview/i })).toBeVisible();
  });
});
