# Plano — GOV-PLATFORM-002: Matriz de territórios M3-M6 (#372)

## Objetivo
Habilitar o paralelismo seguro dos 4 novos milestones de produto (M3 Billing, M4 LGPD, M5 Segurança, M6 Core Unification) atualizando a governança: `.docs/governance/milestone-file-matrix.md` + roadmap `GEMINI.md`.

## Contexto
- Milestones #4 (M3), #5 (M4), #6 (M5), #7 (M6) e 27 issues (#349–#371, #373–#375) já criados com `**Fronteira de arquivos:**`.
- A matriz hoje só cobre M0/M1/M2 → checklist pré-PR não valida território dos novos.
- Regra do usuário: **issue de um milestone jamais toca arquivo de outro milestone**; milestones executáveis em paralelo.

## Etapas (commits atômicos)

### 1. Plano (este arquivo)
- Commit isolado: `docs: aprova plano de execução da Issue #372`.

### 2. Matriz — Seção 2 (arquivos universais novos)
Adicionar **pontos de registro/acesso compartilhados** (regra: somente acréscimo aditivo estritamente necessário; conflito → `git rebase`):
- `backend/src/app.module.ts`, `backend/src/main.ts`
- `frontend/src/app/app.config.ts`, `frontend/src/app/app.routes.ts`
- `frontend/index.html` (somente meta tags de política — M5)
- `env.example`
- `backend/test/smoke/run-all-smoke-tests.sh` (apenas linha de registro)

### 3. Matriz — Seção 3 (linhas novas)
| Milestone | Território |
|---|---|
| **M3** Billing | `backend/src/billing/**`, `backend/migrations/billing/**`, `frontend/src/app/features/billing/**`, `libs/billing-shared/**` |
| **M4** LGPD | `backend/src/lgpd/**`, `backend/migrations/lgpd/**`, `frontend/src/app/features/lgpd/**`, `docs/lgpd/**` + aditivo em `features/auth/register/**` |
| **M5** Segurança | `scripts/security/**`, `backend/src/security/**`, `backend/migrations/security/**`, `.github/dependabot.yml`, `docs/security/**` |
| **M6** Core Unif. | `libs/**` (auth-core, permissions-core, abac-engine, observability-core), `docs/architecture/**` — cross-cutting de **criação**; adoção é no milestone consumidor |

### 4. Matriz — Seção 4 (precedências novas)
1. M5 **não** toca `.github/workflows/**` (M0) → ativação de scripts via issue M0 + comentário cruzado na #363.
2. M6 apenas **cria** libs → adoção exige fronteira + comentário nas duas issues (§4.5).
3. M3/M4 **não alteram** `backend/src/users/**` nem `backend/src/auth/**` (billing = tabelas próprias; LGPD = leitura via repositórios).
4. Integração aditiva em `features/auth/register/**` só pelo M4 (checkbox LGPD).
5. Runner de smoke: registro por rebase (Seção 2).

### 5. Matriz — Seção 5 (ordem)
Adicionar M3/M4/M5/M6 no grafo (livres entre si; M6 após ADR interno; M4 parcialmente após ROPA).

### 6. GEMINI.md
Bullet em **PRÓXIMOS PASSOS** listando M3–M6 com issues-chave + pointer da matriz.

## Validação
- [ ] `git diff --name-only develop...HEAD` ⊆ {`.docs/governance/milestone-file-matrix.md`, `GEMINI.md`, `plano-372-*.md`}
- [ ] `gh pr list` — sem PR aberto tocando os mesmos arquivos
- [ ] Diff revisado contra a Seção 7 da própria matriz

## Fora de escopo
- Criar/editar código de produto (território dos milestones).
- Editar `.github/workflows/**` (M0) — apenas documentar a via de ativação.
