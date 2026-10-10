// billing/billing.constants.ts

/**
 * Status possíveis de uma Subscription (coluna varchar — protocolo §12, nunca enum nativo).
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}

/**
 * Status possíveis de uma Invoice (coluna varchar — protocolo §12).
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

/**
 * Intervalo de cobrança do plano (coluna varchar — protocolo §12).
 */
export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

/**
 * Code dos planos semeados no boot do módulo (upsert idempotente).
 */
export const DEFAULT_PLAN_CODES = ['free', 'pro', 'business'] as const;
