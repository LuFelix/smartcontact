# Plano de Execução — Issue #314
## Setup do Playwright com emulação mobile (iPhone/WebKit + Pixel/Chromium)

---

## 1. Contexto

O frontend não tem automação de UI: validação visual é manual e só no celular.
Esta issue entrega **apenas o setup** (a suíte da profile-page é a #315, o job de
CI é a #317).

Território (fronteira da issue #314):
`frontend/playwright.config.ts`, `frontend/e2e/**`, `frontend/.gitignore`,
`frontend/package.json` + `package-lock.json` (universais — matriz §2).

## 2. Plano de Ação (Commits Atômicos)

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #314` | commit vazio — abre o PR draft #318 |
| 2 | `docs: approve execution plan for Issue #314` | este arquivo, isolado |
| 3 | `test(frontend): add playwright dep and shots ignore` | `npm i -D @playwright/test` + `frontend/.gitignore` com `shots/` |
| 4 | `test(frontend): add mobile playwright config` | `frontend/playwright.config.ts` — testDir `./e2e`, `webServer: npm start` em `localhost:4200`, projects `iPhone 13` (webkit) e `Pixel 7` (chromium) |
| 5 | `test(frontend): add landing smoke screenshot spec` | `frontend/e2e/smoke-landing.spec.ts` + script `e2e:visual` no `package.json` |
| 6 | `chore: final validation and closure of Playwright Setup. closes #314.` | encerramento (após PERGUNTE) |

## 3. Testes / Validação

1. `npx playwright install chromium webkit` (WebKit = motor Safari/iPhone).
2. `npm run e2e:visual` → PNGs em `frontend/shots/` nos 2 viewports.
3. `git status` → nenhum PNG rastreado (`.gitignore` ok).
4. `npm run build` (produção) sem erro.
5. Checklist pré-PR da matriz (diff ⊆ território ∪ universais; `gh pr list`).

## 4. Riscos e Fora de Escopo

- **Landing sem backend:** chamadas de API podem falhar no console; o screenshot
  continua sendo gerado. Se necessário, `docker compose up -d` antes de rodar.
- **Porta 4200:** `webServer` usa `reuseExistingServer: true`.
- **Fora de escopo:** smoke da profile-page (#315), rotina (#316), CI (#317),
  qualquer alteração em `frontend/src/**` (produto).
