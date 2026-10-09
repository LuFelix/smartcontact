// billing/billing.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { BillingInterval, SubscriptionStatus } from './billing.constants';

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
}
