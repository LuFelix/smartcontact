import { Test, TestingModule } from '@nestjs/testing';
import { InteractionLogsService } from './interaction-logs.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InteractionLog, InteractionType } from './entities/interaction-log.entity';
import { UserTagAccess } from 'src/tags/entities/user-tag-access.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('geoip-lite', () => ({
  default: {
    lookup: vi.fn((ip) => {
      if (ip === '8.8.8.8') {
        return { country: 'US', region: 'CA', city: 'Mountain View' };
      }
      return null;
    })
  }
}));

vi.mock('ua-parser-js', () => ({
  UAParser: vi.fn().mockImplementation((ua) => ({
    getBrowser: () => ({ name: ua.includes('Chrome') ? 'Chrome' : 'Safari' }),
    getOS: () => ({ name: ua.includes('Mac') ? 'Mac OS' : 'Windows' }),
    getDevice: () => ({ type: ua.includes('Mobile') ? 'mobile' : undefined })
  }))
}));

describe('InteractionLogsService', () => {
  let service: InteractionLogsService;

  const mockInteractionLogRepository = {
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const mockAccessRepository = { find: vi.fn() };
  const mockTagRepository = { findOne: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionLogsService,
        { provide: getRepositoryToken(InteractionLog), useValue: mockInteractionLogRepository },
        { provide: getRepositoryToken(UserTagAccess), useValue: mockAccessRepository },
        { provide: getRepositoryToken(Tag), useValue: mockTagRepository },
      ],
    }).compile();

    service = module.get<InteractionLogsService>(InteractionLogsService);
  });

  it('should extract and save geo and user-agent data correctly in logVisit', async () => {
    const metadata = { ip: '8.8.8.8', userAgent: 'Mozilla/5.0 Mac OS Chrome Mobile' };
    const mockCreatedLog = { id: 'log-123' };
    
    mockInteractionLogRepository.create.mockReturnValue(mockCreatedLog);
    mockInteractionLogRepository.save.mockResolvedValue(mockCreatedLog);

    await service.logVisit('tag-123', metadata);

    expect(mockInteractionLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tagId: 'tag-123',
        interactionType: InteractionType.VISIT,
        ipAddress: '8.8.8.8',
        country: 'US',
        region: 'CA',
        city: 'Mountain View',
        browser: 'Chrome',
        deviceType: 'Mobile' // Or whatever logic we parse
      })
    );
    expect(mockInteractionLogRepository.save).toHaveBeenCalledWith(mockCreatedLog);
  });

  it('should handle missing or unresolvable IPs gracefully (saving nulls for geo)', async () => {
    const metadata = { ip: '127.0.0.1', userAgent: 'Unknown' };
    const mockCreatedLog = { id: 'log-123' };
    
    mockInteractionLogRepository.create.mockReturnValue(mockCreatedLog);
    mockInteractionLogRepository.save.mockResolvedValue(mockCreatedLog);

    await service.logVisit('tag-123', metadata);

    expect(mockInteractionLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        country: null,
        region: null,
        city: null,
      })
    );
  });
});
