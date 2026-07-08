import { Controller, Get, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Retorna KPIs e tendências agregadas de interações do tenant' })
  async getSummary(
    @GetUser() currentUser: any,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const { sub: userId, role, isSuperAdmin } = currentUser;
    return this.analyticsService.getSummary(tenantId || null, userId, role, isSuperAdmin);
  }

  @Get('recent-reads')
  @ApiOperation({ summary: 'Retorna as leituras recentes de tags do tenant' })
  async getRecentReads(
    @GetUser() currentUser: any,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const { sub: userId, role, isSuperAdmin } = currentUser;
    return this.analyticsService.getRecentReads(tenantId || null, userId, role, isSuperAdmin);
  }
}
