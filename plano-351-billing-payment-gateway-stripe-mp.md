# Plano de Execução — Issue #351 (BE-BILL-002)
## Integração Stripe e MercadoPago (checkout session + webhooks)

---

## 1. Visão Geral
Implementar abstração `PaymentGateway` com duas implementações concretas (`StripeGateway`, `MercadoPagoGateway`) selecionadas por `PAYMENT_PROVIDER`. Exposição de endpoints de checkout e portal, recepção de webhooks com verificação de assinatura e idempotência via tabela `webhook_events`.

---

## 2. Arquitetura

### 2.1 Interface `PaymentGateway` (`backend/src/billing/gateways/payment-gateway.interface.ts`)
```typescript
export interface PaymentGateway {
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionOutput>;
  createPortalSession(input: CreatePortalInput): Promise<PortalSessionOutput>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<WebhookEvent>;
}
```

### 2.2 Fábrica (`backend/src/billing/gateways/payment-gateway.factory.ts`)
```typescript
@Injectable()
export class PaymentGatewayFactory {
  create(): PaymentGateway {
    const provider = process.env.PAYMENT_PROVIDER?.toLowerCase();
    switch (provider) {
      case 'stripe': return new StripeGateway();
      case 'mercadopago': return new MercadoPagoGateway();
      default: throw new Error(`PAYMENT_PROVIDER inválido: ${provider}`);
    }
  }
}
```

### 2.3 Implementações
- **StripeGateway**: usa `stripe` npm, `stripe.checkout.sessions.create`, `stripe.billingPortal.sessions.create`, `stripe.webhooks.constructEvent`.
- **MercadoPagoGateway**: usa `mercadopago` npm, `preference.create` (checkout), `customer.create_card_token`/`merchant_order` para portal, validação HMAC SHA256 do header `x-signature`.

---

## 3. Entidades e Migrações

### 3.1 `WebhookEvent` entity (`backend/src/billing/entities/webhook-event.entity.ts`)
| Campo | Tipo | Detalhes |
|-------|------|----------|
| id | uuid PK | gerado |
| provider | varchar(32) | 'stripe' \| 'mercadopago' |
| eventId | varchar(128) | ID único do evento no provedor |
| eventType | varchar(64) | ex: `checkout.session.completed` |
| payloadHash | varchar(64) | SHA256 do payload bruto (dedup) |
| processedAt | timestamp | null = não processado |
| createdAt | timestamp | default now() |

Índice único: `(provider, eventId)` — garante idempotência.

> **Nota:** projeto usa `synchronize: true` → **não criar arquivos em `backend/migrations/`** (desvio D1 análogo ao #349). A entity é suficiente; tabelas criadas no boot.

---

## 4. Endpoints (Controller: `BillingController`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/billing/checkout` | JWT + Role `administrador` | Cria checkout session para o tenant do `X-Tenant-ID` |
| POST | `/api/billing/portal` | JWT + Role `administrador` | Cria portal session (gerenciar assinatura) |
| POST | `/api/billing/webhook/stripe` | **Sem auth** (assinatura valida) | Recebe webhook Stripe |
| POST | `/api/billing/webhook/mercadopago` | **Sem auth** (assinatura valida) | Recebe webhook MercadoPago |

### 4.1 DTOs
- `CreateCheckoutDto`: `{ planCode: string, successUrl?: string, cancelUrl?: string }`
- `CreatePortalDto`: `{ returnUrl?: string }`
- Webhook: raw body (precisa `rawBody` no `main.ts` para verificação)

---

## 5. Processamento de Webhooks (Idempotência)

Fluxo comum (`BillingService.handleWebhook`):
1. `factory.create()` → gateway
2. `gateway.verifyWebhookSignature(rawBody, signatureHeader)` → `WebhookEvent` tipado
3. `webhookEventRepo.findOne({ provider, eventId })` → se existe → **return 200 (no-op)**
4. Salva `WebhookEvent` com `processedAt = new Date()`
5. Switch por `eventType`:
   - `checkout.session.completed` / `payment_intent.succeeded` → `createSubscriptionFromCheckout(session)`
   - `invoice.payment_succeeded` → `createInvoiceFromEvent(event)`
   - `customer.subscription.updated|deleted` → `updateSubscriptionStatus(subscription)`
   - MP: `payment.approved`, `subscription.preapproval` equivalentes
6. Retorna 200.

---

## 6. Variáveis de Ambiente (`env.example`)

```bash
# Billing
PAYMENT_PROVIDER=stripe               # stripe | mercadopago
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...
```

---

## 7. Dependências (`backend/package.json`)

```json
{
  "stripe": "^14.0.0",
  "mercadopago": "^2.0.0"
}
```

> Adicionadas via `npm install` no container; `package.json`/`lock` são arquivos universais (rebase Seção 2 da matriz).

---

## 8. Smoke Test (Extensão do `test-billing-api.sh`)

Adicionar ao script existente (não criar novo — runner universal já o executa):
1. `POST /billing/checkout` (planCode: pro) → 201 + `checkoutUrl`
2. `POST /billing/portal` → 201 + `portalUrl`
3. Webhook mock: POST `/billing/webhook/stripe` com payload válido + assinatura → 200
4. Reenvio do mesmo webhook → 200 (idempotente, não duplica)
5. Payload sem assinatura / assinatura inválida → 401

---

## 9. Commits Atômicos (ordem)

| Commit | Escopo | Mensagem |
|--------|--------|----------|
| 1 | Interface + Factory | `feat: add PaymentGateway abstraction and factory #351` |
| 2 | StripeGateway | `feat: implement StripeGateway (checkout, portal, webhook) #351` |
| 3 | MercadoPagoGateway | `feat: implement MercadoPagoGateway (checkout, portal, webhook) #351` |
| 4 | WebhookEvent entity | `feat: add WebhookEvent entity for idempotency #351` |
| 5 | Controller endpoints | `feat: add checkout, portal and webhook endpoints #351` |
| 6 | Service handlers | `feat: add webhook processing with idempotent subscription/invoice creation #351` |
| 7 | Env vars + deps | `chore: add payment provider env vars and stripe/mercadopago deps #351` |
| 8 | Smoke test | `test: extend billing smoke with checkout/portal/webhook idempotency #351` |

---

## 10. Desvios Conhecidos (a documentar na issue)

- **D1**: Sem `backend/migrations/**` (projeto usa `synchronize: true`).
- **D2**: `WebhookEvent` criado via `synchronize` no boot (entity suficiente).
- **D3**: `raw body` necessário no `main.ts` para verificação de assinatura — editar `backend/src/main.ts` (arquivo universal §2, rebase).

---

## 11. Checklist de Validação (antes do `PERGUNTE`)

- [ ] `npm run test` (vitest) — 100% passando
- [ ] `docker compose exec -T api npx tsc --noEmit` — exit 0
- [ ] `docker compose exec -T api npm run build` — exit 0
- [ ] `bash backend/test/smoke/run-all-smoke-tests.sh` — 100% PASS
- [ ] `git diff --name-only develop...HEAD` ⊆ fronteira declarada
- [ ] Push + `gh pr ready` + remover `WIP:`

---

## 12. Próximos Passos (após aprovação)

1. Commit isolado deste plano (`docs: aprova plano de execução da Issue #351`)
2. Implementação seguindo ordem dos commits
3. Validação gates
4. Encerramento protocolo §2