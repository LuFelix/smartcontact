import { test, expect, type Page } from '@playwright/test';

const IDENTIFIER = 'admin@smartcontact.com.br';
const PASSWORD = 'Senha@123';
const TABS = ['Geral', 'Contatos', 'Endereços', 'Social', 'Tags & QR'] as const;

type FieldState = { name: string; tag: string; editable: boolean };

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
  await page.waitForTimeout(1200);
}

async function visitTab(page: Page, tab: string): Promise<void> {
  const t = page.getByRole('tab', { name: tab, exact: true });
  await t.evaluate((el) => {
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const strip = el.parentElement?.parentElement;
    strip?.scrollTo({ left: (el as HTMLElement).offsetLeft - 40 });
    (el as HTMLElement).click();
  });
  await expect.poll(async () => {
    const selected = await t.getAttribute('aria-selected');
    return selected === 'true';
  }, { timeout: 5000, message: `Tab "${tab}" did not become selected` }).toBe(true);
  await page.waitForTimeout(450);
}

async function clickButton(page: Page, name: RegExp): Promise<void> {
  await page.getByRole('button', { name }).first().evaluate((el) => (el as HTMLElement).click());
  await page.waitForTimeout(500);
}

async function editableFields(page: Page): Promise<FieldState[]> {
  return page.evaluate(() => {
    const activeBody = document.querySelector<HTMLElement>('.mat-mdc-tab-body-active');
    const scope = activeBody || document.querySelector('form.config-form');
    if (!scope) return [];
    const nodes = Array.from(
      scope.querySelectorAll<HTMLElement>('input[formcontrolname], textarea[formcontrolname], mat-select[formcontrolname]'),
    ).filter((el) =>
      (el as any).checkVisibility
        ? (el as any).checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })
        : true,
    );
    return nodes.map((el) => {
      const name = el.getAttribute('formcontrolname') || '?';
      const tag = el.tagName.toLowerCase();
      if (tag === 'mat-select') {
        return { name, tag, editable: el.getAttribute('aria-disabled') === 'false' };
      }
      const input = el as HTMLInputElement;
      input.focus();
      const editable = document.activeElement === input && !input.disabled && !input.readOnly;
      return { name, tag, editable };
    });
  });
}

async function expectNoEditableField(page: Page, label: string): Promise<void> {
  for (const tab of TABS) {
    await visitTab(page, tab);
    const editable = (await editableFields(page)).filter((f) => f.editable);
    expect(editable, `${label} :: ${tab} deveria estar somente leitura`).toEqual([]);
  }
}

async function expectEditableNamed(page: Page, tab: string, label: string, names: string[]): Promise<void> {
  await visitTab(page, tab);
  const editable = await editableFields(page);
  for (const name of names) {
    expect(
      editable.some((f) => f.name === name && f.editable),
      `${label} :: ${tab} deveria ter '${name}' editável (visíveis: ${JSON.stringify(editable)})`,
    ).toBe(true);
  }
}


test.describe('Profile — ciclo de edição/cancelamento (#339)', () => {
  test('campos travam e destravam de forma coerente em cada ciclo de edição', async ({ page }) => {
    await login(page);
    await openProfile(page);

    await expectNoEditableField(page, 'view inicial');

    await clickButton(page, /Editar Perfil/i);
    await expectEditableNamed(page, 'Geral', 'edit 1', ['firstName', 'lastName']);
    await expectEditableNamed(page, 'Contatos', 'edit 1', ['phoneNumber']);

    await clickButton(page, /^Cancelar$/i);
    await expectNoEditableField(page, 'view após cancel 1');

    await clickButton(page, /Editar Perfil/i);
    await expectEditableNamed(page, 'Geral', 'edit 2', ['firstName', 'lastName']);
    await expectEditableNamed(page, 'Contatos', 'edit 2', ['phoneNumber']);

    await clickButton(page, /^Cancelar$/i);
    await expectNoEditableField(page, 'view após cancel 2');
  });

  test('telefone digitado após cancelar chega ao modelo e é persistido ao salvar', async ({ page }) => {
    const MASKED = '(82) 99988-0000';
    const RAW = '82999880000';
    const phones = page.locator('input[formcontrolname="phoneNumber"]');

    await login(page);
    await openProfile(page);
    await visitTab(page, 'Contatos');
    if ((await phones.count()) === 0) {
      await page
        .locator('.mat-mdc-tab-body-active')
        .getByRole('button', { name: /Adicionar/i })
        .first()
        .evaluate((el) => (el as HTMLElement).click());
      await page.waitForTimeout(400);
    }
    await expect(phones.first()).toBeVisible();

    await clickButton(page, /Editar Perfil/i);
    await visitTab(page, 'Contatos');

    const phone = phones.first();
    await phone.fill(RAW);
    await expect(phone).toHaveValue(MASKED);

    await clickButton(page, /^Salvar$/i);
    await expect(page.getByText('Perfil atualizado com sucesso!')).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('mat-tab-group')).toBeVisible();
    await visitTab(page, 'Contatos');

    const values = await phones.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
    expect(values).toContain(MASKED);
    for (let i = 0; i < (await phones.count()); i++) {
      await expect(phones.nth(i)).toBeDisabled();
    }
  });
});
