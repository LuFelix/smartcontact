import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag, RedirectMode } from './entities/tag.entity';
import { UserTagAccess } from './entities/user-tag-access.entity';
import { User } from 'src/users/entities/user.entity';
import { Profile } from 'src/profiles/entities/profile.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { InteractionLogsService } from 'src/interaction-logs/interaction-logs.service';
import { Repository } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TagsService', () => {
  let service: TagsService;
  let tagRepository: Repository<Tag>;
  let interactionLogsService: InteractionLogsService;

  const mockQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
  };

  const mockTagRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation(dto => dto),
    save: vi.fn().mockImplementation(tag => Promise.resolve({ id: 'tag-123', ...tag })),
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockGenericRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation(dto => dto),
    save: vi.fn(),
  };

  const mockInteractionLogsServ = {
    logVisit: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepo,
        },
        {
          provide: getRepositoryToken(UserTagAccess),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockGenericRepo,
        },
        {
          provide: InteractionLogsService,
          useValue: mockInteractionLogsServ,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    tagRepository = module.get<Repository<Tag>>(getRepositoryToken(Tag));
    interactionLogsService = module.get<InteractionLogsService>(InteractionLogsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if tenantId is missing', async () => {
      await expect(
        service.create({ name: 'Tag Teste' } as any, { sub: 'user-123' }, '')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if UID already exists in tenant', async () => {
      mockTagRepo.findOne.mockResolvedValueOnce({ id: 'tag-old' });
      await expect(
        service.create({ name: 'Tag Teste', uid: '12345' } as any, { sub: 'user-123' }, 'tenant-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should create and save a new tag of type resource', async () => {
      mockTagRepo.findOne.mockResolvedValueOnce(null); // UID free
      mockTagRepo.findOne.mockResolvedValueOnce(null); // handle unique check (generateHandle)
      
      const tagDto = { name: 'Tag Teste', uid: '12345' } as any;
      const result = await service.create(tagDto, { sub: 'user-123' }, 'tenant-1');

      expect(result).toBeDefined();
      expect(result.isResource).toBe(true);
      expect(mockTagRepo.save).toHaveBeenCalled();
    });
  });

  describe('resolveTag', () => {
    it('should return null if tag is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const result = await service.resolveTag('invalid-uuid');
      expect(result).toBeNull();
    });

    it('should resolve and record visit log if metadata is provided', async () => {
      const mockTag = {
        id: 'tag-123',
        tenantId: 'tenant-1',
        nfcRedirectMode: RedirectMode.PROFILE,
        user: { id: 'user-123', name: 'Teste' },
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockTag); // resolve loop
      mockGenericRepo.findOne.mockResolvedValueOnce({ id: 'profile-123' }); // profile mock

      const result = await service.resolveTag('uuid-123', 'nfc', { ip: '127.0.0.1', userAgent: 'Chrome' });

      expect(result).toBeDefined();
      expect(result?.id).toBe('tag-123');
      expect(interactionLogsService.logVisit).toHaveBeenCalledWith('tag-123', {
        ip: '127.0.0.1',
        userAgent: 'Chrome',
        source: 'nfc',
        tenantId: 'tenant-1',
      });
    });
  });

  describe('validateAccess', () => {
    it('should bypass validation if user is super admin', async () => {
      await expect(
        service.validateAccess('tag-123', { sub: 'admin', isSuperAdmin: true }, 'tenant-1')
      ).resolves.not.toThrow();
    });

    it('should bypass validation if user is owner of the tag', async () => {
      mockTagRepo.findOne.mockResolvedValueOnce({ id: 'tag-123', ownerId: 'user-123', tenantId: 'tenant-1' });
      await expect(
        service.validateAccess('tag-123', { sub: 'user-123' }, 'tenant-1')
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if tag belongs to another tenant', async () => {
      mockTagRepo.findOne.mockResolvedValueOnce({ id: 'tag-123', ownerId: 'other-user', tenantId: 'tenant-A' });
      await expect(
        service.validateAccess('tag-123', { sub: 'user-123' }, 'tenant-B')
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
