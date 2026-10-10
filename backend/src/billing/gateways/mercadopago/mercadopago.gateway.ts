import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago';
import * as crypto from 'crypto';
import { PaymentGateway, CreateCheckoutInput, CheckoutSessionOutput, CreatePortalInput, PortalSessionOutput, WebhookEvent } from '../payment-gateway.interface';

export class MercadoPagoGateway implements PaymentGateway {
  private readonly config: MercadoPagoConfig;
  private readonly preApprovalClient: PreApproval;
  private readonly paymentClient: Payment;

  constructor() {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN não configurado');
    }
    this.config = new MercadoPagoConfig({ accessToken });
    this.preApprovalClient = new PreApproval(this.config);
    this.paymentClient = new Payment(this.config);
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionOutput> {
    const plan = this.getPlanDetails(input.planCode);

    if (plan.priceCents === 0) {
      throw new Error('Plano gratuito não requer checkout no MercadoPago');
    }

    const preApproval = await this.preApprovalClient.create({
      body: {
        reason: `Assinatura ${plan.name}`,
        external_reference: input.tenantId,
        payer_email: input.customerEmail,
        back_url: input.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:4200'}/billing/success`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: plan.priceCents / 100,
          currency_id: 'BRL',
        },
        status: 'pending',
      },
    });

    return {
      sessionId: preApproval.id!,
      checkoutUrl: preApproval.init_point!,
    };
  }

  async createPortalSession(input: CreatePortalInput): Promise<PortalSessionOutput> {
    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/billing/portal?customer_id=${input.customerId}`;
    return { portalUrl };
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('MP_WEBHOOK_SECRET não configurado');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Assinatura MercadoPago inválida');
    }

    const data = JSON.parse(payload.toString()) as Record<string, unknown>;
    const resource = (data.data as Record<string, unknown>) || {};

    return {
      provider: 'mercadopago',
      eventId: (data.id as string) || crypto.randomUUID(),
      eventType: (data.type as string) || 'unknown',
      payload: resource,
      customerId: (resource.payer_email as string) || undefined,
      subscriptionId: (resource.preapproval_id as string) || (resource.id as string) || undefined,
      invoiceId: (resource.id as string) || undefined,
      amountCents: Math.round(((resource.transaction_amount as number) || 0) * 100),
      currency: 'BRL',
      status: (resource.status as string) || undefined,
    };
  }

  private getPlanDetails(planCode: string): { name: string; priceCents: number } {
    const plans: Record<string, { name: string; priceCents: number }> = {
      free: { name: 'Free', priceCents: 0 },
      pro: { name: 'Pro', priceCents: 2990 },
      business: { name: 'Business', priceCents: 7990 },
    };
    return plans[planCode] || { name: planCode, priceCents: 0 };
  }
}