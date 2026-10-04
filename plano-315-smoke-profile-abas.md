# Plano — #315 · FE-QA-002 · Smoke da profile-page (abas mobile)

**Branch:** `feature/315-smoke-profile-abas` · **PR:** #319 (`Resolves #315`)
**Território:** `frontend/e2e/**` ∪ `frontend/shots/**` (gitignored) ∪ este arquivo (§8/M1)
**Aprovação:** concedida pelo usuário na sessão ("continue").

## Objetivo

Spec de fumaça **autenticada** que evidencia visualmente o comportamento da
`profile-page` em viewport mobile — em especial a faixa de abas
(Geral/Contatos/Endereços/Social/Tags & QR) e o padrão de scroll com setas
(`mat-tab-group`, `profile-page.html:51`).

## Pré-condições de ambiente (validação, sem commit)

1. `docker compose up -d db api` — **somente** banco + API.
   - NÃO subir o serviço `frontend` do compose: ele ocupa a porta 4200,
     mesma do `npm start` usado pelo `webServer` do Playwright (motivo de
     "só o start funcionar"). O serviço `wp*` é irrelevante aqui.
2. Seed do admin, se ausente no volume: `docker exec smartcontact_nestjs_backend_dev npm run seed`
   (o `CMD` do container é só `start:dev`, não há seed automático).
3. Login confirmado via API antes de rodar a spec (`POST /api/auth/login`
   com `admin@smartcontact.com.br` / `Senha@123`, seed de
   `backend/src/seeds/seed.service.ts:99-100`).

## Commits atômicos (em inglês, What/Why/Testing, `#315`)

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `chore: initialize branch for Issue #315` | commit vazio |
| 2 | `docs: approve execution plan for Issue #315` | este arquivo |
| 3 | `test(frontend): add authenticated profile smoke spec` | `frontend/e2e/smoke-profile.spec.ts` |
| 4 | `chore: final validation and closure of Profile Smoke. closes #315.` | encerramento — **após PERGUNTE** |

## Detalhe da spec (commit 3)

- Login pela UI real (`login-form.html`): `formControlName=identifier`,
  `formControlName=password`, botão `send-button[type=submit]`.
- Após login, ir a `/app/profile` (protegido só pelo `authGuard`; sem
  `PermissionGuard` — `app.routes.ts:70`).
- Capturas por viewport (`shots/profile-<viewport>-<estado>.png`):
  1. aba **Geral** ativa (estado inicial),
  2. faixa de abas / navegação até **Tags & QR** (evidência do scroll).
- Usa o `webServer`/projects já existentes do `playwright.config.ts`
  (`npm run e2e:visual`) — nenhum toque em config, `package.json` ou `src/`.

## Critérios de aceite

- [ ] `npm run e2e:visual` verde (4 testes: 2 estados × 2 viewports)
- [ ] PNGs da profile-page gerados em `frontend/shots/` e ignorados pelo git
- [ ] `npm run build` (produção) continua passando
- [ ] `git diff --name-only develop...HEAD` ⊆ território declarado
- [ ] Nenhum outro PR aberto edita os mesmos arquivos

## Riscos / mitigações

- **Boot lento do Nest** → validar API antes; o `webServer` do Playwright
  é local (ng serve), independente do container.
- **Volume já populado** → seed é idempotente (`SeedService`), rodar só se
  o login via API falhar.
- **Login UI instável** → fallback documentado: injetar `auth_token` +
  `active_tenant_id` via `localStorage` (chaves de
  `auth.service.ts:29-30`) no `beforeEach`.
