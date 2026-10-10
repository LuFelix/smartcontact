# Plano de Execução — Issue #353 (BE-BILL-003)
## Enforcement de limites de plano (guard por tenant)

---

## 1. Visão Geral
Guard global (`LimitsGuard`) que intercepta requests autenticados, resolve o plano efetivo do tenant (via `BillingService.getEffectivePlan`) e aplica limites de membros, tags e leads. Retorna erro padronizado com `limit`, `currentUsage`, `upgradeUrl` quando o limite é excedido.

---

## 2. Arquitetura

### 2.1 `LimitsGuard` (`backend/src/billing/guards/limits.guard.ts`)
- Implementa `CanActivate`
- Executa **após** `AuthGuard('jwt')` (precisa do `X-Tenant-ID` do JWT)
- Usa `BillingService.getEffectivePlan(tenantId)` → retorna `{ plan, subscription }`
- Cache em memória (TTL 30s) via `Map<tenantId, { plan, expires }>`
- Métodos protegidos anotados com `@UseGuards(LimitsGuard)` + `@Limits({ resource: 'members' })` (ou via decorator customizado)

### 2.2 Decorator `@Limits` (`backend/src/billing/decorators/limits.decorator.ts`)
```typescript
export interface LimitsOptions {
  resource: 'members' | 'tags' | 'leads';
  // Opcional: contar quantidade a adicionar (default 1)
  amount?: number;
}
```
Aplicado nos controllers/endpoints que criam recursos contados.

### 2.3 Tipos de Recursos e Contagem
| Resource | Limite do Plano | Contagem (Query) |
|----------|-----------------|------------------|
| `members` | `plan.maxMembers` | `memberships` onde `tenantId = X` e `role != 'contato'` |
| `tags` | `plan.maxTags` | `tags` onde `tenantId = X` e `isResource = true` |
| `leads` | `plan.maxLeads` | `interaction_logs` onde `tenantId = X` |

> `null` = ilimitado (não bloqueia).

### 2.4 Resposta de Erro (402 Payment Required)
```json
{
  "statusCode": 402,
  "message": "Limite do plano atingido",
  "error": "PLAN_LIMIT_REACHED",
  "details": {
    "resource": "members",
    "limit": 1,
    "currentUsage": 1,
    "upgradeUrl": "/billing/upgrade"
  }
}
```

---

## 3. Endpoints a Proteger

| Controller | Método | Resource | Decorator |
|------------|--------|----------|-----------|
| `TeamController` | `POST /team/members` | `members` | `@Limits({ resource: 'members' })` |
| `TagsController` | `POST /tags` | `tags` | `@Limits({ resource: 'tags' })` |
| `InteractionLogsController` | `POST /interaction-logs/capture-lead/:tagId` | `leads` | `@Limits({ resource: 'leads' })` |

---

## 4. Cache (TTL 30s)
```typescript
private readonly cache = new Map<string, { plan: Plan; subscription: Subscription | null; expires: number }>();

private getCachedPlan(tenantId: string): { plan: Plan; subscription: Subscription | null } | null {
  const entry = this.cache.get(tenantId);
  if (entry && entry.expires > Date.now()) return { plan: entry.plan, subscription: entry.subscription };
  return null;
}

private setCachedPlan(tenantId: string, plan: Plan, subscription: Subscription | null): void {
  this.cache.set(tenantId, { plan, subscription, expires: Date.now() + 30_000 });
}
```

---

## 5. Integração com `app.module.ts` (Universal — 1 linha)
```typescript
// app.module.ts
import { LimitsGuard } from './billing/guards/limits.guard';
...
providers: [
  ...
  { provide: APP_GUARD, useClass: LimitsGuard },
],
```

> **Apenas esta linha** no `app.module.ts`. Qualquer outra mudança neste arquivo é proibida (Seção 2 da matriz).

---

## 6. Variáveis de Ambiente
Nenhuma nova variável necessária.

---

## 7. Smoke Test (Extensão do `test-billing-api.sh`)
Adicionar cenários:
1. Criar 2º membro no plano Free (`maxMembers=1`) → 402
2. Criar 6ª tag no plano Free (`maxTags=5`) → 402
3. Criar 51º lead no plano Free (`maxLeads=50`) → 402
4. Verificar payload: `code: 'PLAN_LIMIT_REACHED'`, `limit`, `currentUsage`, `upgradeUrl`
5. Tenant com plano Pro (upgrade via webhook simulado) → não bloqueia dentro do limite

---

## 8. Commits Atômicos

| Commit | Escopo | Mensagem |
|--------|--------|----------|
| 1 | Decorator `@Limits` | `feat: add Limits decorator for resource limits #353` |
| 2 | `LimitsGuard` (core) | `feat: implement LimitsGuard with caching and limit enforcement #353` |
| 3 | Integração `app.module.ts` | `chore: register LimitsGuard globally in app.module.ts #353` |
| 4 | Aplicar decorators nos controllers | `feat: apply @Limits on team/tags/leads endpoints #353` |
| 5 | Smoke test | `test: extend billing smoke with limit enforcement 402 #353` |

---

## 9. Desvios
- **D1**: Sem migrations (synchronize:true).
- **D2**: Cache em memória simples (sem Redis) — suficiente para dev/CI; produção pode evoluir.
- **D3**: `app.module.ts` universal — apenas 1 linha de registro do guard.

---

## 10. Checklist de Validação
- [ ] `npm run test` — 100%
- [ ] `docker compose exec -T api npx tsc --noEmit` — exit 0
- [ ] `docker compose exec -T api npm run build` — exit 0
- [ ] `bash backend/test/smoke/run-all-smoke-tests.sh` — 100% PASS
- [ ] `git diff --name-only develop...HEAD` ⊆ fronteira declarada
- [ ] Push + `gh pr ready` + remover `WIP:`

---

## 11. Próximos Passos
Após aprovação:
1. Commit isolado do plano (`docs: aprova plano de execução da Issue #353`)
2. Implementação seguindo ordem dos commits
3. Validação gates
4. Encerramento protocolo §2