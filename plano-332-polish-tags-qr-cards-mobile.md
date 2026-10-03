# Plano — #332 · UX Mobile: Redesenho e acabamento dos cards da aba Tags & QR

**Branch:** `feature/332-polish-tags-qr-cards-mobile` · **PR:** #334 (`Resolves #332`) · **Milestone:** M2 (permanente)
**Território:** `frontend/src/app/features/users/pages/profile-page/**` ∪ este arquivo
**Skill aplicada:** `mobile-native-ux` (seção 1 e 3 — "Aproveitamento de viewport e acabamento visual M3")

---

## 1. Diagnóstico do Problema

1. **Overflow Horizontal na Aba 'Tags & QR':**
   - O card de preview do QR Code (`.qr-preview-card`) exibe o `<canvas>` e as informações textuais/ações em linha (`display: flex; gap: 16px;`).
   - Em viewports mobile estreitos (360px-390px), a largura somada estoura o limite da tela, provocando barra de rolagem horizontal em toda a página de perfil.
2. **Design e Acabamento Visual dos Cards:**
   - As bordas tracejadas antigas (`1px dashed`) e fundos genéricos dos blocos `.tag-source-group`, `.tag-management-section` e `.nfc-display-card` precisam de acabamento refinado com os **Design Tokens do Material 3** (elevações sutis, bordas `outline-variant` sólidas, superfícies M3 e tipografia harmônica).
3. **Responsividade dos Botões de Ação:**
   - Botões de download do QR Code e cópia do link NFC devem ter layout flexível e empilhar confortavelmente em telas pequenas.

---

## 2. Solução Técnica Proposta

1. **Responsividade do Card de Preview do QR Code (`profile-page.scss`):**
   - No mobile (≤600px), aplicar `flex-direction: column; text-align: center;` com o canvas centralizado e botões de ação em largura proporcional (`flex: 1`), com `max-width: 100%` e `box-sizing: border-box`.
   - **Resultado:** Eliminação de 100% da barra de rolagem horizontal.
2. **Redesenho M3 dos Cards de Destino NFC/QR (`profile-page.scss`):**
   - Substituir bordas tracejadas por bordas sólidas com tokens M3 (`var(--mat-sys-outline-variant)`), superfícies estruturadas (`var(--mat-sys-surface-container)` e `surface-container-low`), e elevação suave (`box-shadow: var(--mat-sys-level1)`).
   - Ajustar ícones e títulos de seção para maior elegância visual.
3. **Seção de Link NFC Mobile-First (`profile-page.scss`):**
   - Ajustar `.nfc-display-card` com padding responsivo e botões de ação adaptáveis.
4. **Validações:**
   - Suíte visual Playwright Mobile (`npm run e2e:visual`): capturar screenshots em iPhone 13 e Pixel 7 sem barra de rolagem horizontal.
   - Suíte Vitest (`npm test`): 100% verde.
   - Build de produção (`npm run build`).

---

## 3. Commits Atômicos

| # | Mensagem de Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #332` | Commit vazio de inicialização |
| 2 | `docs: approve execution plan for Issue #332` | Este arquivo de plano |
| 3 | `feat(profile-page): redesign Tags & QR cards and eliminate horizontal scroll on mobile (#332)` | SCSS dos cards responsivos e acabamento M3 |
| 4 | `docs: record polish tags-qr cards step in GEMINI.md` | Registro do PASSO AV no GEMINI.md |
| 5 | `chore: final validation and closure of Tags and QR Cards Polish. closes #332.` | Commit final de encerramento após aprovação |

---

## 4. Critérios de Aceite

- [ ] Zero rolagem horizontal (overflow-x) na página de perfil em iPhone 13 (390px) e Pixel 7 (412px).
- [ ] Card de preview do QR Code responsivo com layout vertical elegante no mobile.
- [ ] Cards de destino NFC/QR com acabamento visual moderno usando design tokens M3.
- [ ] Suíte Playwright Mobile passa 100% (6/6).
- [ ] Suíte Vitest passa 100% (13/13).
- [ ] `npm run build` compila com sucesso.
