// billing/billing.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { BillingService } from './billing.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreatePortalDto } from './dto/create-portal.dto';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('plans')
  @Roles('administrador')
  @ApiOperation({ summary: 'Cria um plano no catálogo global' })
  @ApiResponse({ status: 201, description: 'Plano criado', type: Plan })
  async createPlan(@Body() createPlanDto: CreatePlanDto): Promise<Plan> {
    return this.billingService.createPlan(createPlanDto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Lista os planos do catálogo (ordem de exibição)' })
  @ApiResponse({ status: 200, description: 'Planos listados', type: [Plan] })
  async findAllPlans(): Promise<Plan[]> {
    return this.billingService.findAllPlans();
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Detalha um plano pelo id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Plano encontrado', type: Plan })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  async findOnePlan(@Param('id', ParseUUIDPipe) id: string): Promise<Plan> {
    return this.billingService.findOnePlan(id);
  }

  @Patch('plans/:id')
  @Roles('administrador')
  @ApiOperation({ summary: 'Atualiza um plano do catálogo' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Plano atualizado', type: Plan })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ): Promise<Plan> {
    return this.billingService.updatePlan(id, updatePlanDto);
  }

  @Delete('plans/:id')
  @Roles('administrador')
  @HttpCode(204)
  @ApiOperation({ summary: 'Desativa um plano (soft delete — FK protegida)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Plano desativado' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  async removePlan(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.billingService.removePlan(id);
  }

  @Get('subscription')
  @ApiOperation({
    summary:
      'Assinatura e plano EFETIVO do tenant do contexto (X-Tenant-ID). Sem subscription = Free.',
  })
  @ApiResponse({
    status: 200,
    description: 'Assinatura (ou null) e plano efetivo do tenant',
    schema: {
      example: {
        subscription: null,
        plan: {
          code: 'free',
          name: 'Free',
          maxMembers: 1,
          maxTags: 5,
          maxLeads: 50,
        },
      },
    },
  })
  async findEffectiveSubscription(
    @GetUser() currentUser: any,
  ): Promise<{ subscription: Subscription | null; plan: Plan }> {
    const { plan, subscription } = await this.billingService.getEffectivePlan(
      currentUser.tenantId,
    );
    return { subscription, plan };
  }

  @Post('checkout')
  @Roles('administrador')
  @ApiOperation({ summary: 'Cria sessão de checkout para assinatura do tenant' })
  @ApiResponse({ status: 201, description: 'Sessão de checkout criada', schema: { example: { sessionId: 'cs_test_...', checkoutUrl: 'https://checkout.stripe.com/...', expiresAt: '2024-01-01T00:00:00.000Z' } } })
  async createCheckout(
    @GetUser() currentUser: any,
    @Body() dto: CreateCheckoutDto,
  ): Promise<{ sessionId: string; checkoutUrl: string; expiresAt?: Date }> {
    return this.billingService.createCheckoutSession(currentUser.tenantId, currentUser.email, dto);
  }

  @Post('portal')
  @Roles('administrador')
  @ApiOperation({ summary: 'Cria sessão do portal do cliente para gerenciar assinatura' })
  @ApiResponse({ status: 201, description: 'Sessão do portal criada', schema: { example: { portalUrl: 'https://billing.stripe.com/...' } } })
  async createPortal(
    @GetUser() currentUser: any,
    @Body() dto: CreatePortalDto,
  ): Promise<{ portalUrl: string }> {
    return this.billingService.createPortalSession(currentUser.tenantId, dto);
  }

  @Post('webhook/stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook do Stripe (sem auth — validação por assinatura)' })
  @ApiBody({ schema: { type: 'object', description: 'Payload bruto do Stripe' } })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.rawBody as string | Buffer;
    if (!rawBody) {
      throw new BadRequestException('Raw body não disponível para verificação de assinatura');
    }
    await this.billingService.handleStripeWebhook(rawBody, signature);
    return { received: true };
  }

  @Post('webhook/mercadopago')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook do MercadoPago (sem auth — validação por assinatura)' })
  @ApiBody({ schema: { type: 'object', description: 'Payload bruto do MercadoPago' } })
  async mercadoPagoWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const signature = req.headers['x-signature'] as string;
    const rawBody = req.rawBody as string | Buffer;
    if (!rawBody) {
      throw new BadRequestException('Raw body não disponível para verificação de assinatura');
    }
    await this.billingService.handleMercadoPagoWebhook(rawBody, signature);
    return { received: true };
  }
}
