import { test, expect, type Page } from '@playwright/test';

const IDENTIFIER = 'admin@smartcontact.com.br';
const PASSWORD = 'Senha@123';
const VIEWPORTS = [320, 360, 390, 414, 480, 768] as const;
const THEMES = ['light', 'dark'] as const;

async function login(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[formcontrolname="identifier"]').fill(IDENTIFIER);
  await page.locator('input[formcontrolname="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/app/**', { timeout: 20_000 });
}

async function openProfileEdit(page: Page): Promise<void> {
  await page.goto('/app/profile', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('mat-tab-group')).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Editar Perfil/i }).first().evaluate((el) => (el as HTMLElement).click());
  await page.waitForTimeout(500);
}

async function measureButtons(page: Page): Promise<{
  groupHeight: number;
  docScrollW: number;
  btnHeights: number[];
  btnWidths: number[];
  sameLine: boolean;
}> {
  return page.evaluate(() => {
    const g = document.querySelector('.edit-actions-group')!;
    const btns = [...g.children] as HTMLElement[];
    const rects = btns.map((b) => b.getBoundingClientRect());
    const ys = rects.map((r) => Math.round(r.y));
    return {
      groupHeight: Math.round(g.getBoundingClientRect().height),
      docScrollW: document.documentElement.scrollWidth,
      btnHeights: rects.map((r) => Math.round(r.height)),
      btnWidths: rects.map((r) => Math.round(r.width)),
      sameLine: new Set(ys).size === 1,
    };
  });
}

async function viewportSnapshot(page: Page, slug: string): Promise<void> {
  await page.screenshot({ path: `shots/evidence-343-${slug}.png`, fullPage: false });
}

test.describe('Profile — action buttons layout on narrow viewports (#343)', () => {
  for (const theme of THEMES) {
    for (const vw of VIEWPORTS) {
      test(`viewport ${vw}px — ${theme} — single row, 44px touch target, no overflow`, async ({ page }, testInfo) => {
        // set theme BEFORE login via addInitScript
        await page.addInitScript((t) => localStorage.setItem('darkMode', t === 'dark' ? 'true' : 'false'), theme);
        
        await login(page);
        await page.setViewportSize({ width: vw, height: testInfo.project.use.viewport?.height ?? 667 });
        await openProfileEdit(page);

        const m = await measureButtons(page);
        const slug = `${vw}px-${theme}-${testInfo.project.name.toLowerCase().replace(/\s+/g, '-')}`;
        await viewportSnapshot(page, slug);

        expect(m.groupHeight, `group height at ${vw}px ${theme}`).toBe(44);
        expect(m.docScrollW, `horizontal overflow at ${vw}px ${theme}`).toBe(vw);
        expect(m.sameLine, `buttons on same line at ${vw}px ${theme}`).toBe(true);
        for (const h of m.btnHeights) {
          expect(h, `button height ≥ 44px at ${vw}px ${theme}`).toBeGreaterThanOrEqual(44);
        }
        expect(m.btnWidths.every((w) => w > 0), 'buttons have positive width').toBe(true);
      });
    }
  }
});