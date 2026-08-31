import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InteractionLog, InteractionType } from '../interaction-logs/entities/interaction-log.entity';
import { vi } from 'vitest';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockQueryBuilder = {
    leftJoin: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    addGroupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
    getCount: vi.fn().mockResolvedValue(10),
    getRawMany: vi.fn().mockResolvedValue([{ name: 'Test', count: 10 }]),
    getMany: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
  };

  const mockLogRepository = {
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(InteractionLog), useValue: mockLogRepository },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should return aggregated geo data in getSummary', async () => {
    const summary = await service.getSummary('tenant-1', 'user-1', 'administrador', false);

    expect(summary).toHaveProperty('byCity');
    expect(summary).toHaveProperty('byRegion');
    expect(summary).toHaveProperty('byCountry');
    expect(summary.byCity).toEqual([{ name: 'Test', count: 10 }]);
  });
});
