import { test, expect } from '@playwright/test';

test.describe('demo checkout', () => {
  test('renders widget shell', async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_CHECKOUT_URL ?? 'http://localhost:3002/');
    await expect(page.locator('body')).toContainText(/Yappy|Checkout|Orquesta/i);
  });
});
