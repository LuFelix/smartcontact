export interface CreateCheckoutInput {
  planCode: string;
  tenantId: string;
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionOutput {
  sessionId: string;
  checkoutUrl: string;
  expiresAt?: Date;
}

export interface CreatePortalInput {
  tenantId: string;
  customerId: string;
  returnUrl?: string;
}

export interface PortalSessionOutput {
  portalUrl: string;
}

export interface WebhookEvent {
  provider: 'stripe' | 'mercadopago';
  eventId: string;
  eventType: string;
  payload: unknown;
  customerId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  amountCents?: number;
  currency?: string;
  status?: string;
}

export interface PaymentGateway {
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionOutput>;
  createPortalSession(input: CreatePortalInput): Promise<PortalSessionOutput>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<WebhookEvent>;
}