# Plano — BE-BILL-001: Entidades de Plan, Subscription e Invoice + seed de planos (#349)

## Objetivo
Criar o módulo `billing` do backend: entidades `Plan`, `Subscription` (por tenant) e `Invoice`, CRUD admin de planos, resolução lazy de plano efetivo (sem assinatura = Free) e smoke test — base de todo o M3.

## Contexto técnico (estudado nesta sessão)
- Padrão de módulo: `backend/src/<mod>/` com `*.module.ts` (`TypeOrmModule.forFeature`) + `*.controller.ts` + `*.service.ts` + `entities/` + `dto/` (ex.: `roles/`).
- Entidades: PK uuid, colunas snake_case (`name: 'tenant_id'`), `@Index`, `Create/DateColumn`, FK com `@JoinColumn` (ex.: `tenants/tenant.entity.ts`).
- **Enums = `varchar` + `@IsEnum()` no DTO** (protocolo §12 — proibido `type: 'enum'` nativo).
- Guard padrão: `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles('administrador')` + Swagger (`@ApiTags/ApiBearerAuth`) — cf. `roles.controller.ts`.
- Contexto tenant: `@GetUser().tenantId` resolvido pela `JwtStrategy` via header `X-Tenant-ID` (fallback payload).
- Validação global `ValidationPipe` ativa em `main.ts`; prefixo global `api` → rotas `/api/billing/*`.
- Testes: **Vitest** (`npm run test`), mocks totais de repositório (§8).

## ⚠️ 2 Desvios declarados (comentário obrigatório na issue #349)

### D1 — NÃO existirá `backend/migrations/billing/**`
O projeto **não usa migrations**: schema gerido por `synchronize: true` (`app.module.ts:35`) e `migration-seed.sh` confirma ("migrations rodam automáticas"). Criar `backend/migrations/**` introduziria um 2º mecanismo de schema nunca usado no repo.
**Solução:** schema nasce das entidades (auto-sync). A fronteira da issue inclui a pasta de migrations como *permissão*, não obrigatória — nenhum arquivo fora dela é tocado.

### D2 — Seed de planos NÃO vai em `backend/src/seeds/**`
`seed.service.ts/seed.module.ts` ficam **fora da fronteira** da #349 (código compartilhado sem dono — matriz §4.7).
**Solução:** `BillingSeedService implements OnModuleInit` **dentro de `backend/src/billing/**`** — upsert idempotente dos planos por `code` único a cada boot do módulo (funciona em lab/CI sem rodar `npm run seed`, zero toque fora da fronteira).

## Entidades (`backend/src/billing/entities/`)

### `plan.entity.ts` → tabela `billing_plans` (catálogo GLOBAL, sem tenant)
| Coluna | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `code` | varchar(30) **unique** | `free`, `pro`, `business` — âncora do upsert |
| `name`, `description` | varchar/text | |
| `priceCents` | int (default 0) | BRL em centavos |
| `interval` | varchar(12) | `monthly` \| `yearly` (`@IsEnum` no DTO) |
| `maxMembers`, `maxTags`, `maxLeads` | int **nullable** | `null` = ilimitado |
| `isActive`, `sortOrder` | boolean/int | catálogo editável |
| `createdAt/updatedAt` | timestamps | |

### `subscription.entity.ts` → `billing_subscriptions` (1 por tenant)
| Coluna | Tipo | Obs |
|---|---|---|
| `id` | uuid PK | |
| `tenantId` | uuid **unique** + `@Index` | 1 assinatura por tenant (estado evolui na mesma linha) |
| `planId` | uuid FK → `billing_plans` (`onDelete: RESTRICT`) | |
| `status` | varchar(20) default `active` | `active`\|`trialing`\|`past_due`\|`canceled` |
| `currentPeriodStart/End` | timestamp nullable | |
| `paymentProvider`, `externalId` | varchar nullable | pré-campo p/ BE-BILL-002 |
| `createdAt/updatedAt` | timestamps | |

**Regra lazy-default:** tenant **sem linha** de subscription ⇒ plano Free (nada altera `tenants/`).

### `invoice.entity.ts` → `billing_invoices` (p/ #351)
`id`, `tenantId` (uuid+index), `subscriptionId` (uuid+index), `planId` nullable, `amountCents`, `currency` varchar(3) default `BRL`, `status` varchar default `open` (`draft|open|paid|void|uncollectible`), `paymentProvider`/`externalId` nullable unique, `issuedAt`/`paidAt`, timestamps.

## Código (commits atômicos, ordem RED→GREEN)

1. **Plano** — commit isolado deste arquivo (§8).
2. **Entities + enums** — `entities/{plan,subscription,invoice}.entity.ts` (+ constantes de status num `billing.constants.ts`).
3. **Spec RED** — `billing.service.spec.ts`:
   - `onModuleInit` cria 3 planos (free/pro/business) e é **idempotente** (2ª execução = 0 inserts; conflito de `code` → upsert);
   - `getEffectivePlan(tenantId)` sem subscription → **Free** com limites (1 membro / 5 tags / 50 leads);
   - com subscription ativa → plano da subscription; `status=canceled` → Free;
   - **isolamento**: subscription do tenant A invisível ao resolver plano do tenant B;
   - CRUD: criar plan code duplicado → erro; `remove()` = soft (`isActive=false`, FK nunca violada).
   - Executar `npm run test -- billing.service.spec.ts` → **comprovar falha**.
4. **Module/Service/Controller GREEN** — `billing.module.ts`, `billing.service.ts`, `billing.controller.ts`, `dto/{create,update}-plan.dto.ts`, `billing-seed.service.ts` (OnModuleInit, upsert por `code`);
   - Rotas (prefixo `api`): `POST/GET /billing/plans`, `GET/PATCH /billing/plans/:id`, `DELETE /billing/plans/:id` (204 soft) — todas `jwt + RolesGuard + @Roles('administrador')`; `GET /billing/subscription` (jwt) → `{ subscription|null, plan: efetivo, limits }` (prova do lazy-default).
5. **Registro** — **1 linha** em `backend/src/app.module.ts` (universal, §2): import + array `BillingModule`.
6. **Smoke (§11)** — `backend/test/smoke/test-billing-api.sh`: login admin → 201 criar plano → 200 list/detalhe → 200 patch → 204 delete → 200 `/billing/subscription` com plano efetivo Free → **401 sem token** → 403 sem role admin (usuário não-admin do seed, senão token adulterado) + `time_total` por request; e criação do runner **`backend/test/smoke/run-all-smoke-tests.sh`** (primeiro módulo do repo: executa `test-*.sh`, consolida `[ PASS ]/[ FAIL ]` e gera `reports/smoke-report.html`).

## Validação / Gates
- [ ] **RED comprovado** antes do GREEN (screenshot/output do teste falhando).
- [ ] `npm run test` (Vitest global) 100% verde — inclui os specs novos.
- [ ] `npx tsc --noEmit` exit 0 (local e `docker compose exec -T api npx tsc --noEmit`).
- [ ] `npm run build` OK.
- [ ] Smoke `test-billing-api.sh` 100% no lab (stack up via docker compose).
- [ ] `git diff --name-only develop...HEAD` ⊆ fronteira ∪ universais (§7 da matriz).
- [ ] **Nunca `npm run lint`** (script tem `--fix` e reformata o repo inteiro — lição aprendida).

## Fronteira de arquivos (cumprimento da issue)
- `backend/src/billing/**` (novo)
- `backend/src/app.module.ts` (1 linha de registro — universal §2)
- `backend/test/smoke/test-billing-api.sh` (novo) · `backend/test/smoke/run-all-smoke-tests.sh` (novo)
- `plano-349-bill-entidades-plan-subscription-invoice.md` (raiz, próprio)

## Fora de escopo (#349)
Gateways/webhooks (#351) · enforcement guard (#353) · frontend (#350/#352/#354) · toque em `users/`, `auth/`, `seeds/`, `tenants/` · qualquer workflow CI (M0).
