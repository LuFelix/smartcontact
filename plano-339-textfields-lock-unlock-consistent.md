# Plano — #339 · Bloqueio/desbloqueio consistente dos campos do Perfil

**Branch:** `feature/339-textfields-lock-unlock-consistent` · **PR:** #342 (`Resolves #339`) · **Milestone:** M2 (bug de produto)
**Território (fronteira da issue):** `frontend/src/app/features/users/pages/profile-page/**` ∪ este arquivo
**Aprovação:** pendente do usuário (protocolo §8).

## Diagnóstico (reproduzido em local e produção, com evidência)

Ciclo testado: visualização → Editar → Cancelar → Editar → Cancelar, em todas as abas,
lendo **duas fontes**: estado do modelo (`ng.getComponent('app-profile').profileForm`) e
estado do DOM (`input.disabled`), via Playwright.

### O que está quebrado

| Situação | Controles raiz (`firstName`, `cpf`, `tagSettings`) | Crianças de `FormArray` (`phones`, `addresses`, `secondaryEmails`, `links`) |
|---|---|---|
| Carga inicial (view) | travado ✅ | travado ✅ |
| 1ª edição | editável ✅ | editável ✅ e **digitação chega ao modelo** ✅ |
| **Após Cancelar (view)** | travado ✅ | **DOM liberado ❌** (modelo `DISABLED` ✅) |
| **Após Cancelar (2ª edição)** | editável ✅ | editável, mas **digitação NÃO chega ao modelo ❌** |

Evidência (Pixel 7, dev server local = código de produção):

```
[pos-cancel VIEW]  linhas: [{i:0,disabled:false},{i:1,disabled:false}]   ← deveriam ser true
[pos-cancel EDIT]  linha 0 -> DOM '(11) 90000-0111' | model: "82999887766"   ← digitou e não salvou
[pos-cancel EDIT]  linha 1 -> DOM '(11) 90100-0111' | model: "82999887766"   ← idem (todas as linhas)
[RAIZ firstName]   'Usuário' -> 'ROOTTEST' | model: 'ROOTTEST'              ← raiz funciona
```

### Causa raiz

1. **`onCancel()` → `populateFormWithUserData()` destrói e recria os `FormArray`**
   (`phones.clear()` + `addPhone()` / `addresses.clear()` + `addAddress()` / etc.)
   com a **visão já vinculada**. O rebuild dispara `cleanUpControl()` nos
   `FormControlName`, que substitui o pipeline do value accessor por `noop` — e nada
   re-registra (`setUpControl`) os controles novos nas linhas existentes.
   Resultado: **bindings órfãos** — o DOM digita num controle descartado e o
   `profileForm` nunca vê a alteração; o `setDisabledState` também não é mais
   acionado → DOM fica liberado no modo visualização.
   - Por que a carga inicial não falha: os corpos das abas (e seus direitivos) são
     criados **depois** do primeiro `clear()+push()` → binding nasce saudável.
   - Por que só as crianças falham: controles raiz nunca são substituídos
     (só `patchValue`), logo o binding sobrevive.
2. **`[disabled]="!isEditing"` nos inputs nativos é no-op no Angular 20** —
   `FormControlName.set isDisabled` só emite `console.warn`
   (`disabledAttrWarning`) e não toca no controle nem no DOM. Ou seja, o template
   nunca esteve travando nada; quem trava é o `setDisabledState` do value accessor,
   que depende justamente do binding saudável que o rebuild quebra.

### Impacto (por isso a prioridade)

- **Perda silenciosa de dados:** após qualquer Cancelar, alterações de telefones,
  endereços, e-mails adicionais e links **não são persistidas pelo Salvar**.
- Campos "digítaveis" que ignoram a digitação (feedback visual mentiroso).

## Commits atômicos

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #339` | commit vazio (feito na abertura) |
| 2 | `docs: approve execution plan for Issue #339` | este arquivo, isolado |
| 3 | `fix(profile-page): sync form arrays in place on cancel to keep view bindings alive` | elimina `clear()+push()` no populate — atualiza controles **em lugar** |
| 4 | `fix(profile-page): drop no-op disabled bindings and lock view mode from the model` | limpeza do `[disabled]` no-op + garantia de travamento pelo modelo |
| 5 | `test(profile-page): add e2e regression for edit/cancel field lock and persistence` | spec de regressão Playwright (ver Fronteira) |
| 6 | `chore: final validation and closure of Textfields Lock Fix. closes #339.` | encerramento — **após PERGUNTE** |

## Estratégia de fix

### A. Rebuild em lugar (núcleo do fix) — commit 3

Novo helper no componente:

```ts
private syncFormArray(array: FormArray, items: [], factory: (item: any) => FormGroup): void {
  // 1. reaproveita controles existentes (patchValue) — mantém o binding vivo
  // 2. push apenas quando há item a mais
  // 3. removeAt apenas quando há item a menos (de trás pra frente)
}
```

`populateFormWithUserData` passa a usar `syncFormArray` para `phones`, `addresses`,
`secondaryEmails` e `links` em vez de `clear()` + `addX()`. `addX()`/`removeX()` do
modo de edição continuam iguais (alta incremental é caso normal do Angular).

### B. Travamento pelo modelo — commit 4

- Remover `[disabled]="!isEditing"` dos `<input>`/`<textarea>` nativos com
  `formControlName` (no-op + spam de `console.warn`); com o fix A o
  `setDisabledState` volta a sincronizar DOM ↔ modelo.
- Manter `[disabled]` em `mat-select`/`mat-slide-toggle` (inputs de componente
  Material — funcionam hoje).
- Validar que `setFormControlsState()` continua sendo a única fonte de verdade do
  modelo em `loadInitialProfile`, `onCancel`, `onSave` e `toggleEditMode`.

### C. Spec de regressão — commit 5

`frontend/e2e/profile-edit-cycle.spec.ts` (evolução do protótipo `zz-repro-339d`):
1. ciclo completo de edição/cancel com asserção **modelo ↔ DOM** em todas as abas;
2. digitação em campo de `FormArray` após cancel → valor presente no `profileForm`;
3. trava visualização = `input.disabled === true` em todas as linhas.

## Validação

- [ ] `npm run test` (Vitest FE) → verde, incluindo teste novo de
      identidade de controles após o populate (não recriar `FormGroup` existente)
- [ ] `npm run e2e:visual` → suíte completa verde (6/6 + novas specs)
- [ ] `npm run build` → ok
- [ ] Evidência manual: ciclo no modo escuro e claro, iPhone 13 e Pixel 7
- [ ] Confirmação de que **Salvar** persiste alteração de telefone feita após um cancel

## Fronteira de arquivos (obrigatória no corpo da PR/issue)

- `frontend/src/app/features/users/pages/profile-page/**`
- `frontend/e2e/profile-edit-cycle.spec.ts` (spec nova de regressão — §4.2 da matriz:
  **exige comentário prévio na issue M1** de teste visual, ex.: #315)
- `plano-339-textfields-lock-unlock-consistent.md`

## Fora de escopo

- Layout/scroll das abas (território M2 de issues anteriores)
- Campos desabilitados por regra de negócio (`email` — é o login, continua travado)
- Débito de lint/build budget (profile-page.scss > 6kB) — issue separada
