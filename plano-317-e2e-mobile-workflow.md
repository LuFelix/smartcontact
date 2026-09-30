# Plano — #317 · FE-QA-004 · CI Playwright mobile (`e2e-mobile.yml`)

**Branch:** `feature/317-e2e-mobile-workflow` · **PR:** #323 (`Resolves #317`) · **Milestone:** M1
**Território:** `.github/workflows/e2e-mobile.yml` ∪ este arquivo
**Aprovação:** concedida pelo usuário na sessão — escopo "stack completo"
("faça o completo, mais seguro testar o máximo") + "pode seguir".

## Objetivo

Workflow **próprio e independente** (matriz §4.1 — não mexer no `deploy.yml`
da #259) que valida a suíte mobile nos **6 testes** (landing + profile
autenticada, iPhone 13/WebKit e Pixel 7/Chromium) em PRs do território M1.

## Commits atômicos (em inglês, What/Why/Testing, `#317`)

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #317` | commit vazio |
| 2 | `docs: approve execution plan for Issue #317` | este arquivo |
| 3 | `ci: add mobile e2e workflow` | `.github/workflows/e2e-mobile.yml` |
| 4 | `chore: final validation and closure of Mobile E2E CI. closes #317.` | encerramento — **após run verde + PERGUNTE** |

## Design do workflow (commit 3)

**Gatilhos**
- `pull_request` com paths: `frontend/e2e/**`, `frontend/playwright.config.ts`,
  `frontend/package.json`, `frontend/package-lock.json` e o próprio
  `.github/workflows/e2e-mobile.yml` (auto-validação do PR);
- `workflow_dispatch` (disparo manual).

**Job (`ubuntu-latest`), em ordem:**
1. `actions/checkout`;
2. `actions/setup-node` **Node 20** (paridade com `Dockerfile*.dev:
   node:20-alpine`) + cache npm (`cache-dependency-path:
   frontend/package-lock.json`);
3. **Gerar `.env` mínimo** por heredoc — o `docker-compose.yml` exige
   `env_file: ./.env` e o repo não tem `.env.example`. Espelha todas as
   `${VAR}` interpoladas do compose, com valores **dummy** (segredos reais
   nunca entram no CI);
4. `docker compose up -d db api` → **aguardar API** com retry de `curl`
   (nada de sleep cego);
5. **`docker exec smartcontact_nestjs_backend_dev npm run seed`**
   (runner começa com volume vazio; seed = `ts-node src/seed.ts`, idempotente);
6. **Gate de prontidão:** `POST /api/auth/login` com o admin seed →
   esperado **HTTP 201** (aborta o job se falhar);
7. `cd frontend && npm ci`;
8. `npx playwright install --with-deps chromium webkit`
   (runner GitHub tem sudo passwordless p/ as deps);
9. `npm run e2e:visual` → 6 testes;
10. `actions/upload-artifact` (sempre): `frontend/shots/`,
    `frontend/test-results/`, `frontend/playwright-report/` (debug no PR).

**Independência (§4.1):** nenhum outro workflow tocado — `deploy.yml`
inalterado; execução paralela com a #259 permitida.

**Portas:** runner limpo — 5432/3000/4200 livres (o mapeamento 5433 só
existia por causa do lab mas-ia na máquina local).

## Validação (critérios de aceite da issue)

- [ ] Arquivo único criado (diff = workflow + plano)
- [ ] O PR #323 dispara a si mesmo (paths incluem o próprio workflow)
- [ ] **Primeira run verde** observada (`gh run watch`) com Chromium + WebKit
      e os 6 testes
- [ ] Nenhum arquivo de produto alterado
- [ ] `deploy.yml` intocado

## Riscos / mitigações

- **Build da imagem do backend no runner** (+2-4min) → aceito; compose builda
  do `Dockerfile.dev`.
- **Interpolação `${VAR}` faltando** no `.env` dummy → gerar cobrindo
  `grep '\${' docker-compose.yml`.
- **WebKit em `ubuntu-latest`** → suportado oficialmente via
  `install --with-deps`.
- **Suite lenta no runner** → timeout do job em 30min; `workers: 1` da
  config local mantém estabilidade (2-5min de teste esperado).

## Fora de escopo

- Alterar `deploy.yml` ou criar outros workflows
- Tocar specs/config (M1 já fechado; só CI aqui)
