# Plano — #329 · Fix do botão 'Testar Configuração' sobrepondo título no card NFC vs QR

**Branch:** `feature/329-fix-testar-configuracao-overlap` · **PR:** #331 (`Resolves #329`) · **Milestone:** M2 (permanente)
**Território:** `frontend/src/app/features/users/pages/profile-page/**` ∪ este arquivo
**Skill aplicada:** `mobile-native-ux` (seção 2 — "Layouts responsivos e flex-direction em viewports estreitos")

---

## 1. Diagnóstico do Problema

No viewport mobile (iPhone 13 `390px` e Pixel 7 / Galaxy `366px-412px`), o cabeçalho do card de redirecionamento (`.header-with-action .header-inner`) renderiza o título `<mat-card-title>Controle de Redirecionamento (NFC vs QR)</mat-card-title>` e o botão de ação `<a>Testar Configuração</a>` em linha (`display: flex; justify-content: space-between; align-items: center;`).

Como o título é longo e o espaço horizontal disponível é de ~300px (descontando margens e paddings do card), os elementos colidem e o botão azul se sobrepõe diretamente ao texto "Redirecionamento", tornando o cabeçalho ilegível.

---

## 2. Solução Técnica Proposta (Mobile-First)

1. **Reestruturação Flexbox no Mobile (`profile-page.scss`):**
   - Atualizar `.header-with-action .header-inner`:
     - Em telas desktop (>768px): manter `flex-direction: row; justify-content: space-between; align-items: center;`.
     - Em telas mobile (≤768px): aplicar `flex-direction: column; align-items: stretch; gap: 12px;` com botões e links ocupando `width: 100%` e alinhamento centralizado.
2. **Padding Responsivo do Card (`.tag-management-section`):**
   - Reduzir o padding de `32px` para `20px 16px` no mobile (≤768px) para dar mais respiro horizontal ao conteúdo interno.
3. **Grid de Configuração NFC vs QR (`.tag-settings-dual-grid`):**
   - Garantir empilhamento vertical limpo (`grid-template-columns: 1fr;`) em viewports estreitos.

---

## 3. Commits Atômicos

| # | Mensagem de Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #329` | Commit vazio de inicialização |
| 2 | `docs: aprova plano de execução da Issue #329` | Este arquivo de plano |
| 3 | `fix(profile-page): stack header action button on mobile to prevent text overlap` | Ajustes no `profile-page.scss` |
| 4 | `docs: record fix test config button overlap step in GEMINI.md` | Registro do PASSO AT no GEMINI.md |
| 5 | `chore: final validation and closure of Test Config Button Overlap. closes #329.` | Commit final de encerramento após aprovação |

---

## 4. Validação e Critérios de Aceite

- [ ] Sem sobreposição entre o título "Controle de Redirecionamento (NFC vs QR)" e o botão "Testar Configuração" em iPhone 13 (390px) e Pixel 7 / Galaxy (366px-412px).
- [ ] `cd frontend && npm run e2e:visual` → Suíte Playwright Mobile passa 6/6.
- [ ] `cd frontend && npm test` → Suíte Vitest passa 100%.
- [ ] `npm run build` no frontend compila sem erros.
