import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionLog, InteractionType } from '../interaction-logs/entities/interaction-log.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(InteractionLog)
    private readonly logRepository: Repository<InteractionLog>,
  ) {}

  async getSummary(tenantId: string | null, userId: string, role: string, isSuperAdmin: boolean) {
    const baseQuery = this.logRepository.createQueryBuilder('log')
      .leftJoin('log.tag', 'tag');

    if (tenantId) {
      baseQuery.andWhere('tag.tenantId = :tenantId', { tenantId });
    } else if (!isSuperAdmin) {
      return this.emptySummary();
    }

    if (!isSuperAdmin && role !== 'administrador') {
      baseQuery.andWhere('(tag.ownerId = :userId OR tag.userId = :userId)', { userId });
    }

    const [totalReads, totalLeads, readsToday, readsThisWeek, leadsThisWeek, trend, byDevice, byBrowser, bySource] =
      await Promise.all([
        this.countByType(baseQuery, InteractionType.VISIT),
        this.countByType(baseQuery, InteractionType.LEAD),
        this.countByTypeSince(baseQuery, InteractionType.VISIT, 'today'),
        this.countByTypeSince(baseQuery, InteractionType.VISIT, 'week'),
        this.countByTypeSince(baseQuery, InteractionType.LEAD, 'week'),
        this.trend(baseQuery, 7),
        this.breakdown(baseQuery, 'deviceType'),
        this.breakdown(baseQuery, 'browser'),
        this.bySource(baseQuery),
      ]);

    return { totalReads, totalLeads, readsToday, readsThisWeek, leadsThisWeek, trend, byDevice, byBrowser, bySource };
  }

  async getRecentReads(tenantId: string | null, userId: string, role: string, isSuperAdmin: boolean) {
    const baseQuery = this.logRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.tag', 'tag')
      .andWhere('log.interaction_type = :type', { type: InteractionType.VISIT });

    if (tenantId) {
      baseQuery.andWhere('tag.tenantId = :tenantId', { tenantId });
    } else if (!isSuperAdmin) {
      return [];
    }

    if (!isSuperAdmin && role !== 'administrador') {
      baseQuery.andWhere('(tag.ownerId = :userId OR tag.userId = :userId)', { userId });
    }

    baseQuery.orderBy('log.accessed_at', 'DESC')
      .take(50);

    const logs = await baseQuery.getMany();

    return logs.map(log => ({
      accessedAt: log.accessedAt,
      source: log.source,
      tag: {
        name: log.tag?.name || null,
        uuid: log.tag?.uuid || null,
      },
    }));
  }

  private async countByType(qb: ReturnType<typeof this.logRepository.createQueryBuilder>, type: InteractionType): Promise<number> {
    return qb.clone()
      .andWhere('log.interaction_type = :type', { type })
      .getCount();
  }

  private async countByTypeSince(qb: ReturnType<typeof this.logRepository.createQueryBuilder>, type: InteractionType, period: 'today' | 'week'): Promise<number> {
    const clone = qb.clone()
      .andWhere('log.interaction_type = :type', { type });

    if (period === 'today') {
      clone.andWhere('log.accessed_at >= CURRENT_DATE');
    } else {
      clone.andWhere('log.accessed_at >= CURRENT_DATE - INTERVAL \'7 days\'');
    }

    return clone.getCount();
  }

  private async trend(qb: ReturnType<typeof this.logRepository.createQueryBuilder>, days: number) {
    const rows = await qb.clone()
      .select('DATE(log.accessed_at)::text', 'date')
      .addSelect(`COUNT(*) FILTER (WHERE log.interaction_type = '${InteractionType.VISIT}')`, 'reads')
      .addSelect(`COUNT(*) FILTER (WHERE log.interaction_type = '${InteractionType.LEAD}')`, 'leads')
      .andWhere('log.accessed_at >= CURRENT_DATE - INTERVAL \'' + days + ' days\'')
      .groupBy('DATE(log.accessed_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map(r => ({ date: r.date, reads: Number(r.reads), leads: Number(r.leads) }));
  }

  private async bySource(qb: ReturnType<typeof this.logRepository.createQueryBuilder>) {
    const rows = await qb.clone()
      .select('COALESCE(log.source, \'desconhecido\')', 'name')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.source')
      .orderBy('count', 'DESC')
      .getRawMany();

    return rows.map(r => ({ name: r.name, count: Number(r.count) }));
  }

  private async breakdown(qb: ReturnType<typeof this.logRepository.createQueryBuilder>, column: 'deviceType' | 'browser') {
    const colName = column === 'deviceType' ? 'device_type' : 'browser';

    const rows = await qb.clone()
      .select(`log.${column}`, 'name')
      .addSelect('COUNT(*)', 'count')
      .andWhere(`log.${column} IS NOT NULL`)
      .groupBy(`log.${column}`)
      .orderBy('count', 'DESC')
      .getRawMany();

    return rows.map(r => ({ name: r.name, count: Number(r.count) }));
  }

  private emptySummary() {
    return {
      totalReads: 0,
      totalLeads: 0,
      readsToday: 0,
      readsThisWeek: 0,
      leadsThisWeek: 0,
      trend: [],
      byDevice: [],
      byBrowser: [],
      bySource: [],
    };
  }
}
