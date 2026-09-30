# Plano — #320 · Skill `mobile-native-ux` (checklist UX mobile nativo + loop visual)

**Branch:** `feature/320-skill-mobile-native-ux` · **PR:** #321 (`Resolves #320`) · **Milestone:** M2
**Território:** `.opencode/skills/mobile-native-ux/**` ∪ `.docs/governance/milestone-file-matrix.md` ∪ este arquivo
**Aprovação:** concedida pelo usuário na sessão ("faça como sugeriu") — plano resumido apresentado antes da execução.

## Objetivo

Criar skill de projeto do opencode que padroniza como o agente atua em UX mobile
"nativo" no SmartContact, reutilizando o loop visual já construído no M1.
Caminho padrão `.opencode/skills/<name>/SKILL.md` — **sem** `opencode.json`
(reconhecida após restart do opencode).

## Commits atômicos (em inglês, What/Why/Testing, `#320`)

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #320` | commit vazio |
| 2 | `docs: approve execution plan for Issue #320` | este arquivo |
| 3 | `docs: add mobile-native-ux skill` | `.opencode/skills/mobile-native-ux/SKILL.md` |
| 4 | `docs: register .opencode territory in governance matrix` | linha `.opencode/**` em `.docs/governance/milestone-file-matrix.md` |
| 5 | `chore: final validation and closure of Mobile Native UX Skill. closes #320.` | encerramento — **após PERGUNTE** |

## Conteúdo do `SKILL.md` (commit 3)

1. **Frontmatter:** `name: mobile-native-ux` (igual à pasta) e `description`
   com gatilhos literais (mobile, UX, abas, scroll, safe-area, gestures,
   `profile-page`, `e2e:visual`), regra "Use ONLY when..." para não disparar
   em tarefas não-UI.
2. **Quando usar:** tarefas de UI/UX mobile no `frontend/` (criar/editar telas,
   corrigir rolagem, abas, animações, gestos).
3. **Contexto do stack:** Angular 20 + Angular Material + SCSS; validação via
   `cd frontend && npm run e2e:visual` (iPhone 13/WebKit + Pixel 7/Chromium);
   evidências em `frontend/shots/` (gitignored); API em `:3000` com admin seed
   (`admin@smartcontact.com.br`); serviços `docker compose up -d db api`
   (Postgres do projeto em 5433).
4. **Checklist "nativo" (iOS HIG × Android Material 3):**
   - `100dvh`/`100svh` em vez de `100vh` (barra do navegador mobile);
   - `env(safe-area-inset-*)` em top/bottom (notch, home indicator);
   - inputs com fonte ≥16px (senão o iOS dá zoom automático);
   - alvos de toque ≥44×44px e espaçamento entre eles;
   - `overscroll-behavior: contain` para evitar "puxar" a página inteira;
   - faixa de abas: scroll-snap, setas visíveis quando transborda, sem
     depender de gesto oculto;
   - animações: curvas/durations distintas iOS (suave, mais lenta) ×
     Android (rápida, mais direta), 200–300ms;
   - `prefers-reduced-motion` respeitado;
   - headers/abas sticky sem cobrir conteúdo (scroll-padding);
   - teclado virtual não cobrir bottom nav/CTA (`interactive-widget`);
   - `-webkit-tap-highlight-color` e estados de toque/press visíveis;
   - contraste AA mínimo.
5. **Loop de validação (regras do M2):** mudou UI mobile → `npm run e2e:visual`
   → PNGs como evidência → anexar na issue; **bug visual novo = issue M2**
   (milestone permanente); **spec de regressão nova pode ser criada em M2 só
   com comentário prévio na issue M1 correspondente** (fronteira flexível
   tipo CODEOWNERS, já acordado).
6. **Guardrails:** `**Fronteira de arquivos:**` obrigatória em issue; plano
   (`plano-<id>-*.md`) aprovado antes de codar; commits em inglês com `#ID`;
   universais só por rebase; nunca commitar em `develop`/`main`.

## Ajuste na matriz (commit 4)

Adicionar à seção de territórios a linha:
`.opencode/**` — artefatos de agente do projeto (skill/agent/command), com
precedência: não colide com código do produto; alterações seguem o mesmo
protocolo de issue/PR.

## Critérios de aceite

- [ ] `SKILL.md` válido (frontmatter `name` = pasta, `description` com gatilhos)
- [ ] Linha `.opencode/**` na matriz
- [ ] Após restart do opencode: skill listada no `skill` tool
- [ ] Smoke real: skill aplicada numa tarefa da profile-page
- [ ] `npm run e2e:visual` 6/6 (nada do frontend foi tocado)
- [ ] `git diff --name-only develop...HEAD` ⊆ território

## Fora de escopo

- MCP Figma (backlog opcional já anotado na issue #320)
- Qualquer mudança em `frontend/src/**` ou `frontend/e2e/**`
