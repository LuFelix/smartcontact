import {
  HttpException,
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BillingService } from '../billing.service';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { LIMITS_KEY, LimitsOptions } from '../decorators/limits.decorator';

interface CachedPlan {
  plan: Plan;
  subscription: Subscription | null;
  expires: number;
}

@Injectable()
export class LimitsGuard implements CanActivate {
  private readonly cache = new Map<string, CachedPlan>();
  private readonly CACHE_TTL = 30_000; // 30s

  constructor(
    private readonly reflector: Reflector,
    @Inject(BillingService)
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitsOptions = this.reflector.get<LimitsOptions>(
      LIMITS_KEY,
      context.getHandler(),
    );

    if (!limitsOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: { tenantId: string } }>();
    
    // Tentar obter tenantId do user (populado pelo JWT) OU do header X-Tenant-ID
    let tenantId = request.user?.tenantId;
    if (!tenantId) {
      tenantId = request.headers['x-tenant-id'] as string;
    }

    if (!tenantId) {
      return true;
    }

    const { resource, amount = 1 } = limitsOptions;

    const { plan } = await this.getEffectivePlanWithCache(tenantId);
    const limit = this.getLimitForResource(plan, resource);

    if (limit === null) {
      return true; // ilimitado
    }

    const currentUsage = await this.countCurrentUsage(tenantId, resource);
    const projectedUsage = currentUsage + amount;

    if (projectedUsage > limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: 'Limite do plano atingido',
          error: 'PLAN_LIMIT_REACHED',
          details: {
            resource,
            limit,
            currentUsage,
            upgradeUrl: '/billing/upgrade',
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }

  private async getEffectivePlanWithCache(tenantId: string): Promise<{ plan: Plan; subscription: Subscription | null }> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expires > Date.now()) {
      return { plan: cached.plan, subscription: cached.subscription };
    }

    const { plan, subscription } = await this.billingService.getEffectivePlan(tenantId);

    this.cache.set(tenantId, {
      plan,
      subscription,
      expires: Date.now() + this.CACHE_TTL,
    });

    return { plan, subscription };
  }

  private getLimitForResource(plan: Plan, resource: 'members' | 'tags' | 'leads'): number | null {
    switch (resource) {
      case 'members':
        return plan.maxMembers;
      case 'tags':
        return plan.maxTags;
      case 'leads':
        return plan.maxLeads;
      default:
        return null;
    }
  }

  private async countCurrentUsage(tenantId: string, resource: 'members' | 'tags' | 'leads'): Promise<number> {
    // Usar o BillingService ou injetar repositórios específicos
    // Para simplificar, delegamos ao BillingService que tem acesso aos repositórios
    return this.billingService.countResourceUsage(tenantId, resource);
  }
}