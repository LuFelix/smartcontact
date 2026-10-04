import { test, expect, type Page } from '@playwright/test';

const IDENTIFIER = 'admin@smartcontact.com.br';
const PASSWORD = 'Senha@123';

async function login(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[formcontrolname="identifier"]').fill(IDENTIFIER);
  await page.locator('input[formcontrolname="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/app/**', { timeout: 20_000 });
}

async function openProfile(page: Page): Promise<void> {
  await page.goto('/app/profile', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('mat-tab-group')).toBeVisible();
}

function slugOf(projectName: string): string {
  return projectName.toLowerCase().replace(/\s+/g, '-');
}

test.describe('Profile — evidência visual das abas em mobile', () => {
  test('captura a aba Geral ativa nos dois viewports', async ({ page }, testInfo) => {
    await login(page);
    await openProfile(page);

    await expect(page.getByRole('tab', { name: 'Geral' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Geral' })).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(600);

    const slug = slugOf(testInfo.project.name);
    await page.screenshot({ path: `shots/profile-${slug}-geral.png`, fullPage: true });
  });

  test('navega até a aba Tags & QR nos dois viewports', async ({ page }, testInfo) => {
    await login(page);
    await openProfile(page);

    const tagsTab = page.getByRole('tab', { name: 'Tags & QR' });
    await tagsTab.scrollIntoViewIfNeeded();
    await tagsTab.click();
    await expect(tagsTab).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(600);

    const slug = slugOf(testInfo.project.name);
    await page.screenshot({ path: `shots/profile-${slug}-tags-qr.png`, fullPage: true });
  });
});
