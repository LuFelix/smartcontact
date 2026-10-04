# Plano — #343 · Botão Cancelar estourando em viewports estreitas (≤320px) e com fonte ampliada

**Branch:** `feature/343-cancelar-overflow-mobile` · **PR:** draft `WIP: ... Resolves #343` · **Milestone:** M2 (bug visual)
**Território (fronteira da issue):** `frontend/src/app/features/users/pages/profile-page/**` ∪ `frontend/e2e/profile-edit-actions-visual.spec.ts` ∪ este arquivo
**Aprovação:** pendente do usuário (protocolo §8).

---

## Diagnóstico (medição programática, sem gravar arquivos)

| Viewport | Comportamento do grupo Salvar/Cancelar |
|---|---|
| 360–1280px | 1 linha, sem overflow horizontal (`docScrollW === vw`) |
| **320px** (iPhone SE, Android pequenos) | **Empilha**: Salvar em cima, Cancelar embaixo (2 linhas) |
| Fonte/zoom ampliada (ex.: Android 150%) | Mesmo efeito de wrap em larguras maiores |

**Causa raiz (CSS):**
- `.edit-actions-group { flex-wrap: wrap }` + `.avatar-action-btn { min-width: 80px; white-space: nowrap }`
- Altura mobile = **38px** vs critério de aceite da #335: **touch target ≥ 44px** (não atendido)
- Gap 8px + padding 16px → largura mínima por botão ~112px; dois botões + gap = 232px; com avatar 64px + gap 16px = 312px > 320px viewport → wrap

**Evidência anterior:** #337 (fechada) item 3 citava *"revisar a acomodação do botão Cancelar em viewports ultra-compactos para evitar qualquer risco de estouro de layout"* — sem critério de aceite nem teste.

---

## Commits atômicos

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #343` | commit vazio (protocolo §1) |
| 2 | `docs: approve execution plan for Issue #343` | este arquivo, isolado |
| 3 | `fix(profile-page): ensure action buttons stay single-row down to 320px and meet 44px touch target` | ajustar CSS: `min-width: 0` + `flex: 1 1 auto` nos botões; `height: 44px` mobile; `gap` responsivo; remover `white-space: nowrap` se necessário; testar wrap apenas em <320px |
| 4 | `test(profile-page): add e2e regression for action buttons layout on narrow viewports` | `frontend/e2e/profile-edit-actions-visual.spec.ts` — Playwright: iPhone 13 / Pixel 7 + viewports 320/360/390/414; assert 1 linha, sem horizontal scroll, botões ≥44px altura, centrados; dark/light |
| 5 | `chore: final validation and closure of Cancelar Overflow Fix. closes #343.` | encerramento — **após PERGUNTE** (protocolo §2) |

---

## Estratégia de fix (commit 3)

### CSS alvo (`profile-page.scss`, dentro de `.profile-avatar-section` / `.edit-actions-group`)

```scss
.edit-actions-group {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    gap: 8px;
    width: 100%;
    // permitir encolher, não estourar
    flex-wrap: nowrap;        // ← força 1 linha
    min-width: 0;             // ← flex children podem encolher abaixo de min-content

    .avatar-action-btn {
      flex: 1 1 auto;         // ← cresce/encolhe proporcionalmente
      min-width: 0;           // ← crítico para flex-shrink funcionar
      height: 44px;           // ← touch target ≥ 44px (critério #335)
      padding: 0 16px;
      font-size: 0.875rem;
      border-radius: 22px !important;
      white-space: nowrap;    // mantém texto em 1 linha
      overflow: hidden;
      text-overflow: ellipsis;

      mat-icon {
        font-size: 18px; width: 18px; height: 18px; margin-right: 4px;
        flex-shrink: 0;
      }
    }
  }
}
```

### Validação visual (manual + Playwright)
- 320px: 1 linha, botões iguais, altura 44px, sem scroll horizontal
- 360/390/414/480/600/768/desktop: layout preservado
- Dark & Light: cores M3 OK
- Touch: 44×44px mínimo

---

## Spec de regressão (commit 4)

`frontend/e2e/profile-edit-actions-visual.spec.ts` (nova — §4.2 exige comentário prévio na M1 **#315**):

1. Login admin → Perfil → Editar
2. Para cada viewport [320, 360, 390, 414, 480, 768] × [iPhone 13, Pixel 7] × [dark, light]:
   - Assert `.edit-actions-group` height == 44px (single row)
   - Assert `document.documentElement.scrollWidth === viewportWidth`
   - Assert botões visíveis, centralizados, `getBoundingClientRect().height >= 44`
   - Screenshot `shots/evidence-343-{viewport}-{device}-{theme}.png`
3. Tear down

---

## Validação (gates)

- [ ] `npm run test` (Vitest FE) → verde
- [ ] `npm run e2e:visual` → suíte completa verde (6/6 smoke + novas specs)
- [ ] `npm run build` → OK
- [ ] Evidência manual: dark/light × iPhone 13 / Pixel 7 × 320/360/390
- [ ] Confirmação: botão Cancelar **não empilha** em 320px; touch target ≥ 44px

---

## Fronteira de arquivos (obrigatória no corpo da PR/issue)

- `frontend/src/app/features/users/pages/profile-page/**`
- `frontend/e2e/profile-edit-actions-visual.spec.ts` (spec nova de regressão — §4.2 da matriz: **exige comentário prévio na issue M1** de teste visual, ex.: #315)
- `plano-343-cancelar-overflow.md`

---

## Fora de escopo

- Polimento geral dos botões (já endereçado na #335)
- Lógica de disable/enable do formulário (resolvido na #339)
- Redesign do header/avatar (resolvido na #330)