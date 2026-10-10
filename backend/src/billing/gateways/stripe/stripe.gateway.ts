import Stripe from 'stripe';
import { PaymentGateway, CreateCheckoutInput, CheckoutSessionOutput, CreatePortalInput, PortalSessionOutput, WebhookEvent } from '../payment-gateway.interface';

export class StripeGateway implements PaymentGateway {
  private readonly stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY não configurado');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionOutput> {
    const plan = await this.getPlanDetails(input.planCode);

    if (plan.priceCents === 0) {
      throw new Error('Plano gratuito não requer checkout no Stripe');
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: input.customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Plano ${plan.name}`,
              metadata: {
                plan_code: input.planCode,
                tenant_id: input.tenantId,
              },
            },
            unit_amount: plan.priceCents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: input.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:4200'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:4200'}/billing/cancel`,
      metadata: {
        tenant_id: input.tenantId,
        plan_code: input.planCode,
      },
      subscription_data: {
        metadata: {
          tenant_id: input.tenantId,
          plan_code: input.planCode,
        },
      },
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url!,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    };
  }

  private async getPlanDetails(planCode: string): Promise<{ name: string; priceCents: number }> {
    const plans: Record<string, { name: string; priceCents: number }> = {
      free: { name: 'Free', priceCents: 0 },
      pro: { name: 'Pro', priceCents: 4990 },
      business: { name: 'Business', priceCents: 14990 },
    };
    return plans[planCode] || { name: planCode, priceCents: 0 };
  }

  async createPortalSession(input: CreatePortalInput): Promise<PortalSessionOutput> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:4200'}/billing`,
    });

    return { portalUrl: session.url };
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET não configurado');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Assinatura Stripe inválida: ${err instanceof Error ? err.message : String(err)}`);
    }

    const data = event.data.object as Record<string, unknown>;
    return {
      provider: 'stripe',
      eventId: event.id,
      eventType: event.type,
      payload: data,
      customerId: (data.customer as string) || undefined,
      subscriptionId: (data.subscription as string) || (data['subscription'] as string) || undefined,
      invoiceId: (data.invoice as string) || undefined,
      amountCents: (data.amount as number) || (data.amount_total as number) || undefined,
      currency: (data.currency as string) || undefined,
      status: (data.status as string) || (data.payment_status as string) || undefined,
    };
  }
}