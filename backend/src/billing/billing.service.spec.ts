// billing/billing.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { Tag } from '../tags/entities/tag.entity';
import { InteractionLog } from '../interaction-logs/entities/interaction-log.entity';
import { BillingInterval, SubscriptionStatus, DEFAULT_PLAN_CODES } from './billing.constants';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';

describe('BillingService', () => {
  let service: BillingService;

  const mockPlanRepository = {
    findOne: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  };

  const mockSubscriptionRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
  };

  const mockInvoiceRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
  };

  const mockWebhookEventRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
  };

  const mockMembershipRepository = {
    count: vi.fn(),
  };

  const mockTagRepository = {
    count: vi.fn(),
  };

  const mockInteractionLogRepository = {
    count: vi.fn(),
  };

  const mockGatewayFactory = {
    create: vi.fn(),
  };

  const freePlan: Partial<Plan> = {
    id: 'plan-free',
    code: 'free',
    name: 'Free',
    priceCents: 0,
    interval: BillingInterval.MONTHLY,
    maxMembers: 1,
    maxTags: 5,
    maxLeads: 50,
    isActive: true,
    sortOrder: 0,
  };

  const proPlan: Partial<Plan> = {
    id: 'plan-pro',
    code: 'pro',
    name: 'Pro',
    priceCents: 4990,
    interval: BillingInterval.MONTHLY,
    maxMembers: 10,
    maxTags: 100,
    maxLeads: 1000,
    isActive: true,
    sortOrder: 1,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPlanRepository.create.mockImplementation((dto) => ({ ...dto }));
    mockPlanRepository.save.mockImplementation((entity) => Promise.resolve(entity));
    mockSubscriptionRepository.create.mockImplementation((dto) => ({ ...dto }));
    mockSubscriptionRepository.save.mockImplementation((entity) => Promise.resolve(entity));
    mockInvoiceRepository.create.mockImplementation((dto) => ({ ...dto }));
    mockInvoiceRepository.save.mockImplementation((entity) => Promise.resolve(entity));
    mockWebhookEventRepository.create.mockImplementation((dto) => ({ ...dto }));
    mockWebhookEventRepository.save.mockImplementation((entity) => Promise.resolve(entity));
    mockMembershipRepository.count.mockResolvedValue(0);
    mockTagRepository.count.mockResolvedValue(0);
    mockInteractionLogRepository.count.mockResolvedValue(0);
    mockGatewayFactory.create.mockReturnValue({
      createCheckoutSession: vi.fn().mockResolvedValue({ sessionId: 'cs_test', checkoutUrl: 'https://checkout.stripe.com/test' }),
      createPortalSession: vi.fn().mockResolvedValue({ portalUrl: 'https://billing.stripe.com/test' }),
      verifyWebhookSignature: vi.fn().mockResolvedValue({ provider: 'stripe', eventId: 'evt_test', eventType: 'test', payload: {} }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(Plan), useValue: mockPlanRepository },
        { provide: getRepositoryToken(Subscription), useValue: mockSubscriptionRepository },
        { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepository },
        { provide: getRepositoryToken(WebhookEvent), useValue: mockWebhookEventRepository },
        { provide: getRepositoryToken(Membership), useValue: mockMembershipRepository },
        { provide: getRepositoryToken(Tag), useValue: mockTagRepository },
        { provide: getRepositoryToken(InteractionLog), useValue: mockInteractionLogRepository },
        { provide: PaymentGatewayFactory, useValue: mockGatewayFactory },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('onModuleInit (seed idempotente dos planos)', () => {
    it('cria os 3 planos padrão (free, pro, business) quando inexistentes', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await service.onModuleInit();

      expect(mockPlanRepository.save).toHaveBeenCalledTimes(DEFAULT_PLAN_CODES.length);
      const savedCodes = mockPlanRepository.create.mock.calls.map((c) => c[0].code);
      expect(savedCodes).toEqual(expect.arrayContaining(['free', 'pro', 'business']));
    });

    it('é idempotente: segunda execução não re-insere planos idênticos', async () => {
      const existing = {
        free: { ...freePlan },
        pro: { ...proPlan },
        business: {
          id: 'plan-business',
          code: 'business',
          name: 'Business',
          priceCents: 14990,
          interval: BillingInterval.MONTHLY,
          maxMembers: null,
          maxTags: null,
          maxLeads: null,
          isActive: true,
          sortOrder: 2,
        },
      } as unknown as Record<string, Plan>;

      mockPlanRepository.findOne.mockImplementation(({ where }) =>
        Promise.resolve(existing[where.code] ?? null),
      );

      await service.onModuleInit();

      expect(mockPlanRepository.save).not.toHaveBeenCalled();
      expect(mockPlanRepository.create).not.toHaveBeenCalled();
    });

    it('registra o seed do free com os limites do plano gratuito (1 membro, 5 tags, 50 leads)', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await service.onModuleInit();

      const freeCall = mockPlanRepository.create.mock.calls.find((c) => c[0].code === 'free');
      expect(freeCall).toBeDefined();
      expect(freeCall![0]).toMatchObject({
        maxMembers: 1,
        maxTags: 5,
        maxLeads: 50,
        priceCents: 0,
        isActive: true,
      });
    });
  });

  describe('getEffectivePlan (lazy default Free)', () => {
    it('sem subscription resolve o plano Free com os limites (1/5/50)', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockPlanRepository.findOne.mockResolvedValue({ ...freePlan } as Plan);

      const result = await service.getEffectivePlan('tenant-sans-sub');

      expect(mockSubscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-sans-sub' },
        relations: ['plan'],
      });
      expect(result.plan.code).toBe('free');
      expect(result.plan.maxMembers).toBe(1);
      expect(result.plan.maxTags).toBe(5);
      expect(result.plan.maxLeads).toBe(50);
      expect(result.subscription).toBeNull();
    });

    it('com subscription ativa resolve o plano da subscription', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-a',
        status: SubscriptionStatus.ACTIVE,
        plan: { ...proPlan },
      } as Subscription);
      mockPlanRepository.findOne.mockResolvedValue({ ...freePlan } as Plan);

      const result = await service.getEffectivePlan('tenant-a');

      expect(result.plan.code).toBe('pro');
      expect(result.subscription?.id).toBe('sub-1');
      expect(mockPlanRepository.findOne).not.toHaveBeenCalled();
    });

    it('com subscription cancelada volta para o Free', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue({
        id: 'sub-2',
        tenantId: 'tenant-a',
        status: SubscriptionStatus.CANCELED,
        plan: { ...proPlan },
      } as Subscription);
      mockPlanRepository.findOne.mockResolvedValue({ ...freePlan } as Plan);

      const result = await service.getEffectivePlan('tenant-a');

      expect(result.plan.code).toBe('free');
      expect(result.subscription).toBeNull();
    });

    it('isolamento: tenant B sem subscription resolve Free mesmo com A pagando Pro', async () => {
      mockSubscriptionRepository.findOne.mockImplementation(({ where }) =>
        Promise.resolve(
          where.tenantId === 'tenant-a'
            ? ({ id: 'sub-a', tenantId: 'tenant-a', status: SubscriptionStatus.ACTIVE, plan: { ...proPlan } } as Subscription)
            : null,
        ),
      );
      mockPlanRepository.findOne.mockResolvedValue({ ...freePlan } as Plan);

      const resultB = await service.getEffectivePlan('tenant-b');

      expect(resultB.plan.code).toBe('free');
      expect(mockSubscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-b' },
        relations: ['plan'],
      });
      expect(resultB.subscription).toBeNull();
    });
  });

  describe('createPlan', () => {
    it('rejeita code duplicado com BadRequestException', async () => {
      mockPlanRepository.findOne.mockResolvedValue({ ...freePlan } as Plan);

      await expect(service.createPlan({ code: 'free', name: 'Free 2' } as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPlanRepository.save).not.toHaveBeenCalled();
    });

    it('cria um plano válido', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      const result = await service.createPlan({
        code: 'starter',
        name: 'Starter',
        priceCents: 1990,
        maxMembers: 3,
      } as any);

      expect(result.code).toBe('starter');
      expect(mockPlanRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOnePlan / updatePlan', () => {
    it('update de plano inexistente lança NotFoundException', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePlan('missing-id', { name: 'X' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('atualiza campos do plano existente', async () => {
      mockPlanRepository.findOne.mockResolvedValue({ ...proPlan, name: 'Pro' } as Plan);

      const result = await service.updatePlan('plan-pro', { name: 'Pro Plus', priceCents: 5990 } as any);

      expect(result.name).toBe('Pro Plus');
      expect(result.priceCents).toBe(5990);
      expect(mockPlanRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('removePlan (soft delete)', () => {
    it('desativa o plano (isActive=false) sem remover a linha (FK protegida)', async () => {
      mockPlanRepository.findOne.mockResolvedValue({ ...proPlan, isActive: true } as Plan);

      await service.removePlan('plan-pro');

      expect(mockPlanRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'plan-pro', isActive: false }),
      );
      expect(mockPlanRepository.remove).not.toHaveBeenCalled();
    });

    it('plano inexistente lança NotFoundException', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await expect(service.removePlan('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
