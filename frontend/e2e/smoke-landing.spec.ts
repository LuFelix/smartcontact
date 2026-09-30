import { test, expect } from '@playwright/test';

test.describe('Landing — evidência visual mobile', () => {
  test('captura screenshot full page nos dois viewports', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForLoadState('load');
    await page.waitForTimeout(800);

    const slug = testInfo.project.name.toLowerCase().replace(/\s+/g, '-');
    await page.screenshot({ path: `shots/landing-${slug}.png`, fullPage: true });

    expect(testInfo.errors).toHaveLength(0);
  });
});
