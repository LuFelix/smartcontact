// billing/billing.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { Tag } from '../tags/entities/tag.entity';
import { InteractionLog } from '../interaction-logs/entities/interaction-log.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreatePortalDto } from './dto/create-portal.dto';
import { BillingInterval, SubscriptionStatus, InvoiceStatus } from './billing.constants';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';
import { WebhookEvent as WebhookEventType } from './gateways/payment-gateway.interface';
import * as crypto from 'crypto';

/**
 * Resultado da resolução do plano efetivo de um tenant.
 * Tenant sem subscription (ou cancelada) = plano Free (lazy default).
 */
export interface EffectivePlan {
  plan: Plan;
  subscription: Subscription | null;
}

/**
 * Serviço do módulo de billing: catálogo de planos (CRUD admin),
 * seed idempotente no boot e resolução do plano efetivo por tenant.
 */
@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  /**
   * Planos padrão aplicados no boot (upsert por code — D2 do plano:
   * o seed vive DENTRO do módulo, fora de backend/src/seeds/**).
   */
  private readonly DEFAULT_PLANS = [
    {
      code: 'free',
      name: 'Free',
      description: 'Plano gratuito com limites básicos.',
      priceCents: 0,
      interval: BillingInterval.MONTHLY,
      maxMembers: 1,
      maxTags: 5,
      maxLeads: 50,
      sortOrder: 0,
    },
    {
      code: 'pro',
      name: 'Pro',
      description: 'Para profissionais que precisam de escala.',
      priceCents: 4990,
      interval: BillingInterval.MONTHLY,
      maxMembers: 10,
      maxTags: 100,
      maxLeads: 1000,
      sortOrder: 1,
    },
    {
      code: 'business',
      name: 'Business',
      description: 'Times e workspaces sem limites.',
      priceCents: 14990,
      interval: BillingInterval.MONTHLY,
      maxMembers: null,
      maxTags: null,
      maxLeads: null,
      sortOrder: 2,
    },
  ] as const;

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepository: Repository<WebhookEvent>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(InteractionLog)
    private readonly interactionLogRepository: Repository<InteractionLog>,
    private readonly gatewayFactory: PaymentGatewayFactory,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultPlans();
  }

  /**
   * Upsert idempotente dos planos padrão por `code`.
   * Idêntico = nenhum save (seguro a cada boot).
   */
  private async seedDefaultPlans(): Promise<void> {
    for (const defaults of this.DEFAULT_PLANS) {
      const existing = await this.planRepository.findOne({ where: { code: defaults.code } });

      if (!existing) {
        const plan = this.planRepository.create({ ...defaults, isActive: true });
        await this.planRepository.save(plan);
        this.logger.log(`Plano seed '${defaults.code}' criado.`);
        continue;
      }

      // isActive NÃO é trackeado: o seed não pode reativar planos
      // desativados por um admin a cada boot.
      const trackedKeys = [
        'name',
        'priceCents',
        'interval',
        'maxMembers',
        'maxTags',
        'maxLeads',
        'sortOrder',
      ] as const;
      const divergent = trackedKeys.some((key) => existing[key] !== defaults[key]);

      if (divergent) {
        await this.planRepository.save({ ...existing, ...defaults });
        this.logger.log(`Plano seed '${defaults.code}' atualizado para os defaults.`);
      }
    }
  }

  async createPlan(dto: CreatePlanDto): Promise<Plan> {
    const existing = await this.planRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(`Já existe um plano com o code "${dto.code}".`);
    }

    const plan = this.planRepository.create({
      ...dto,
      interval: dto.interval ?? BillingInterval.MONTHLY,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return await this.planRepository.save(plan);
  }

  async findAllPlans(): Promise<Plan[]> {
    return await this.planRepository.find({ order: { sortOrder: 'ASC', priceCents: 'ASC' } });
  }

  async findOnePlan(id: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plano com ID ${id} não encontrado.`);
    }
    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOnePlan(id);
    Object.assign(plan, dto);
    return await this.planRepository.save(plan);
  }

  /**
   * Soft delete: o plano referenciado por subscriptions nunca é removido
   * da tabela (FK RESTRICT) — apenas sai do catálogo ativo.
   */
  async removePlan(id: string): Promise<void> {
    const plan = await this.findOnePlan(id);
    plan.isActive = false;
    await this.planRepository.save(plan);
  }

  /**
   * Subscription bruta do tenant (null = nunca assinou).
   */
  async getSubscription(tenantId: string): Promise<Subscription | null> {
    return await this.subscriptionRepository.findOne({ where: { tenantId } });
  }

  /**
   * Plano EFETIVO do tenant com isolamento por tenant_id.
   * - sem subscription ou status canceled → Free;
   * - caso contrário → plano da subscription.
   */
  async getEffectivePlan(tenantId: string): Promise<EffectivePlan> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
      relations: ['plan'],
    });

    if (subscription && subscription.status !== SubscriptionStatus.CANCELED) {
      return { plan: subscription.plan, subscription };
    }

    const freePlan = await this.planRepository.findOne({ where: { code: 'free' } });
    if (!freePlan) {
      throw new NotFoundException('Plano padrão (free) não encontrado. Execute o seed do módulo.');
    }
    return { plan: freePlan, subscription: null };
  }

  async createCheckoutSession(
    tenantId: string,
    customerEmail: string,
    dto: CreateCheckoutDto,
  ): Promise<{ sessionId: string; checkoutUrl: string; expiresAt?: Date }> {
    const plan = await this.planRepository.findOne({ where: { code: dto.planCode } });
    if (!plan) {
      throw new NotFoundException(`Plano "${dto.planCode}" não encontrado.`);
    }
    if (!plan.isActive) {
      throw new BadRequestException(`Plano "${dto.planCode}" está inativo.`);
    }
    if (plan.priceCents === 0) {
      throw new BadRequestException('Plano gratuito não requer checkout.');
    }

    const gateway = this.gatewayFactory.create();
    return gateway.createCheckoutSession({
      planCode: dto.planCode,
      tenantId,
      customerEmail,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  async createPortalSession(
    tenantId: string,
    dto: CreatePortalDto,
  ): Promise<{ portalUrl: string }> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
      relations: ['plan'],
    });

    if (!subscription || !subscription.providerCustomerId) {
      throw new BadRequestException('Tenant não possui assinatura ativa com gateway configurado.');
    }

    const gateway = this.gatewayFactory.create();
    return gateway.createPortalSession({
      tenantId,
      customerId: subscription.providerCustomerId,
      returnUrl: dto.returnUrl,
    });
  }

  async handleStripeWebhook(rawBody: string | Buffer, signature: string): Promise<void> {
    await this.processWebhook('stripe', rawBody, signature);
  }

  async handleMercadoPagoWebhook(rawBody: string | Buffer, signature: string): Promise<void> {
    await this.processWebhook('mercadopago', rawBody, signature);
  }

  private async processWebhook(
    provider: 'stripe' | 'mercadopago',
    rawBody: string | Buffer,
    signature: string,
  ): Promise<void> {
    const gateway = this.gatewayFactory.create();

    let event: WebhookEventType;
    try {
      event = await gateway.verifyWebhookSignature(rawBody, signature);
    } catch (err) {
      this.logger.warn(`Webhook ${provider} assinatura inválida: ${err instanceof Error ? err.message : String(err)}`);
      throw new UnauthorizedException('Assinatura do webhook inválida');
    }

    // Idempotência: verifica se já processou este eventId
    const existing = await this.webhookEventRepository.findOne({
      where: { provider, eventId: event.eventId },
    });
    if (existing) {
      this.logger.log(`Webhook ${provider} ${event.eventId} já processado (idempotente).`);
      return;
    }

    // Salva o evento antes de processar (evita race conditions)
    const payloadHash = this.hashPayload(rawBody);
    const webhookEvent = this.webhookEventRepository.create({
      provider,
      eventId: event.eventId,
      eventType: event.eventType,
      payloadHash,
      payload: event.payload as Record<string, unknown>,
      processedAt: new Date(),
    });
    await this.webhookEventRepository.save(webhookEvent);

    try {
      await this.applyWebhookEvent(event);
      this.logger.log(`Webhook ${provider} ${event.eventType} processado com sucesso.`);
    } catch (err) {
      this.logger.error(`Erro ao processar webhook ${provider} ${event.eventId}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  private async applyWebhookEvent(event: WebhookEventType): Promise<void> {
    switch (event.eventType) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded':
        if (event.subscriptionId) {
          await this.createOrUpdateSubscriptionFromGateway(event);
        }
        break;
      case 'invoice.payment_succeeded':
        if (event.invoiceId) {
          await this.createInvoiceFromEvent(event);
        }
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        if (event.subscriptionId) {
          await this.updateSubscriptionFromGateway(event);
        }
        break;
      case 'payment.approved':
      case 'subscription.preapproval':
        if (event.subscriptionId) {
          await this.createOrUpdateSubscriptionFromGateway(event);
        }
        break;
      default:
        this.logger.log(`Evento ${event.eventType} não tratado explicitamente.`);
    }
  }

  private async createOrUpdateSubscriptionFromGateway(event: WebhookEventType): Promise<void> {
    if (!event.subscriptionId || !event.customerId) return;

    const planCode = this.extractPlanCode(event);
    const plan = planCode ? await this.planRepository.findOne({ where: { code: planCode } }) : null;
    if (!plan) return;

    let subscription = await this.subscriptionRepository.findOne({
      where: { providerSubscriptionId: event.subscriptionId },
    });

    if (!subscription) {
      // Tenta encontrar por tenant_id via metadata ou external_reference
      const tenantId = this.extractTenantId(event);
      if (!tenantId) return;

      subscription = this.subscriptionRepository.create({
        tenantId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        paymentProvider: event.provider,
        providerSubscriptionId: event.subscriptionId,
        providerCustomerId: event.customerId,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    } else {
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.plan = plan;
      subscription.paymentProvider = event.provider;
      subscription.providerSubscriptionId = event.subscriptionId;
      subscription.providerCustomerId = event.customerId;
    }

    await this.subscriptionRepository.save(subscription);
  }

  private async createInvoiceFromEvent(event: WebhookEventType): Promise<void> {
    if (!event.invoiceId || !event.customerId || !event.amountCents) return;

    const tenantId = this.extractTenantId(event);
    if (!tenantId) return;

    const existing = await this.invoiceRepository.findOne({
      where: { externalId: event.invoiceId },
    });
    if (existing) return;

    const invoice = this.invoiceRepository.create({
      tenantId,
      paymentProvider: event.provider,
      externalId: event.invoiceId,
      amountCents: event.amountCents,
      currency: event.currency || 'BRL',
      status: InvoiceStatus.PAID,
      paidAt: new Date(),
    });
    await this.invoiceRepository.save(invoice);
  }

  private async updateSubscriptionFromGateway(event: WebhookEventType): Promise<void> {
    if (!event.subscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { providerSubscriptionId: event.subscriptionId },
    });
    if (!subscription) return;

    if (event.eventType === 'customer.subscription.deleted' || event.status === 'canceled') {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
    } else if (event.status === 'past_due') {
      subscription.status = SubscriptionStatus.PAST_DUE;
    } else if (event.status === 'active') {
      subscription.status = SubscriptionStatus.ACTIVE;
    }

    subscription.paymentProvider = event.provider;
    subscription.providerSubscriptionId = event.subscriptionId;
    if (event.customerId) {
      subscription.providerCustomerId = event.customerId;
    }

    await this.subscriptionRepository.save(subscription);
  }

  private extractPlanCode(event: WebhookEventType): string | null {
    const metadata = (event.payload as Record<string, unknown>)?.metadata as Record<string, string> | undefined;
    if (metadata?.plan_code) return metadata.plan_code;
    const subscription = (event.payload as Record<string, unknown>)?.subscription as { metadata?: Record<string, string> } | undefined;
    if (subscription?.metadata?.plan_code) return subscription.metadata.plan_code;
    return null;
  }

  private extractTenantId(event: WebhookEventType): string | null {
    const metadata = (event.payload as Record<string, unknown>)?.metadata as Record<string, string> | undefined;
    if (metadata?.tenant_id) return metadata.tenant_id;
    const externalRef = (event.payload as Record<string, unknown>)?.external_reference as string | undefined;
    if (externalRef) return externalRef;
    return null;
  }

  private hashPayload(payload: string | Buffer): string {
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async countResourceUsage(tenantId: string, resource: 'members' | 'tags' | 'leads'): Promise<number> {
    switch (resource) {
      case 'members':
        return this.membershipRepository.count({
          where: { tenantId },
        });
      case 'tags':
        return this.tagRepository.count({
          where: { tenantId, isResource: true },
        });
      case 'leads':
        return this.interactionLogRepository.count({
          where: { tenantId },
        });
      default:
        return 0;
    }
  }
}
