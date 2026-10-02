# Plano — #330 · UX Mobile: Header ultra-compacto e faixa de abas com navegação tátil fluida

**Branch:** `feature/330-profile-header-compact-fluid-tabs` · **PR:** #333 (`Resolves #330`) · **Milestone:** M2 (permanente)
**Território:** `frontend/src/app/features/users/pages/profile-page/**` ∪ este arquivo
**Skill aplicada:** `mobile-native-ux` (seção 1 e 3 — "Aproveitamento vertical de viewport" e "Faixa de abas nativa")

---

## 1. Diagnóstico do Problema

1. **Ocupação Excessiva do Cabeçalho no Mobile:**
   - No viewport mobile (iPhone 13 `390px` e Pixel 7 / Galaxy `366px-412px`), o conjunto `.profile-card-header` + `.profile-avatar-section` + botão `Editar Perfil` consome ~380px da altura vertical (~50% do ecrã).
   - O usuário não precisa de um título gigante "Meu Perfil" repetitivo consumindo a tela inteira quando o objetivo é acessar o formulário e configurar suas tags/dados.
2. **Navegação de Abas:**
   - Garantir que a faixa de abas suba para a área nobre e ofereça resposta rápida e suave ao toque/tap direto.

---

## 2. Solução Técnica Proposta

1. **Header Mobile Ultra-Compacto (`profile-page.scss` / `profile-page.html`):**
   - Em telas mobile (≤768px):
     - Reduzir o padding de `.profile-container` de `40px 24px` para `12px 8px`.
     - Transformar o `.profile-card-header` em um header enxuto com título de `1.25rem` e subtítulo escondido ou reduzido.
     - Compactar `.profile-avatar-section`: avatar reduzido para `64px` ou `72px`, com padding vertical de `12px` (em vez de 40px), botão `Editar Perfil` em tamanho compacto.
     - **Ganho:** Redução de ~260px de altura desperdiçada, colocando a faixa de abas e os cards de configuração no centro da visão imediata do usuário.
2. **Faixa de Abas Tátil e Fluida (`profile-page.scss`):**
   - Refinar a área de visualização das abas com scroll suave, eliminando qualquer atraso perceptível de transição.
3. **Validação:**
   - Playwright Mobile (`npm run e2e:visual`): validar screenshots full-page no iPhone 13 e Pixel 7.
   - Vitest (`npm test`): garantir integridade dos testes unitários.
   - Build de produção (`npm run build`).

---

## 3. Commits Atômicos

| # | Mensagem de Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #330` | Commit vazio de inicialização |
| 2 | `docs: approve execution plan for Issue #330` | Este arquivo de plano |
| 3 | `feat(profile-page): ultra-compact mobile header layout to maximize viewport space (#330)` | SCSS/HTML do header compacto no mobile |
| 4 | `docs: record compact header and fluid tabs step in GEMINI.md` | Registro do PASSO AU no GEMINI.md |
| 5 | `chore: final validation and closure of Compact Mobile Header and Fluid Tabs. closes #330.` | Commit final de encerramento após aprovação |

---

## 4. Critérios de Aceite

- [ ] Cabeçalho mobile consome menos de 20% do viewport vertical no mobile (iPhone 13 e Pixel 7).
- [ ] A faixa de abas e os cards de conteúdo ficam imediatamente visíveis sem necessidade de rolagem prévia.
- [ ] Suíte Playwright Mobile passa 100% (6/6).
- [ ] Suíte Vitest passa 100% (13/13).
- [ ] `npm run build` passa sem erros.
