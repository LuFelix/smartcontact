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
  let accessRepository: Repository<UserTagAccess>;
  let userRepository: Repository<User>;
  let tenantRepository: Repository<Tenant>;
  let interactionLogsService: InteractionLogsService;

  const mockQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
    getMany: vi.fn(),
  };

  const mockTagRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn().mockImplementation(dto => dto),
    save: vi.fn().mockImplementation(tag => Promise.resolve({ id: 'tag-123', ...tag })),
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockGenericRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn().mockImplementation(dto => dto),
    save: vi.fn().mockImplementation(entity => Promise.resolve({ id: 'access-123', ...entity })),
    remove: vi.fn().mockResolvedValue(undefined),
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
    accessRepository = module.get<Repository<UserTagAccess>>(getRepositoryToken(UserTagAccess));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tenantRepository = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
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
      mockTagRepo.findOne.mockResolvedValueOnce(null); // handle unique check
      
      const tagDto = { name: 'Tag Teste', uid: '12345' } as any;
      const result = await service.create(tagDto, { sub: 'user-123' }, 'tenant-1');

      expect(result).toBeDefined();
      expect(result.isResource).toBe(true);
      expect(mockTagRepo.save).toHaveBeenCalled();
    });
  });

  describe('createDefaultTag', () => {
    it('should return existing tag if already exists for user and tenant', async () => {
      const existing = { id: 'tag-existing', isResource: false };
      mockTagRepo.findOne.mockResolvedValueOnce(existing);

      const result = await service.createDefaultTag('user-123', 'owner-123', 'tenant-1');
      expect(result).toEqual(existing);
      expect(mockTagRepo.save).not.toHaveBeenCalled();
    });

    it('should generate unique handle and create default tag if not exists', async () => {
      mockTagRepo.findOne.mockResolvedValueOnce(null); // not found default tag
      mockGenericRepo.findOne.mockResolvedValueOnce({ id: 'user-123', name: 'John Doe', username: 'johndoe' }); // user repository find
      mockGenericRepo.findOne.mockResolvedValueOnce({ id: 'tenant-1', slug: 'ws-john' }); // tenant repository find
      mockTagRepo.findOne.mockResolvedValueOnce(null); // unique handle check succeeds

      const result = await service.createDefaultTag('user-123', 'owner-123', 'tenant-1');
      expect(result).toBeDefined();
      expect(result.isResource).toBe(false);
      expect(mockTagRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should throw BadRequestException if tenantId is not provided', async () => {
      await expect(
        service.findAll({ isSuperAdmin: false }, '')
      ).rejects.toThrow(BadRequestException);
    });

    it('should return tags for the tenant', async () => {
      mockTagRepo.find.mockResolvedValueOnce([{ id: 'tag-1', isResource: true }]);
      const result = await service.findAll({ isSuperAdmin: false }, 'tenant-1');
      expect(result).toHaveLength(1);
      expect(mockTagRepo.find).toHaveBeenCalled();
    });
  });

  describe('findMyDelegated', () => {
    it('should throw BadRequestException if tenantId is missing', async () => {
      await expect(
        service.findMyDelegated({ sub: 'user-1' }, '')
      ).rejects.toThrow(BadRequestException);
    });

    it('should return delegated tags using query builder', async () => {
      const mockTags = [{ id: 'tag-1', isResource: true }];
      mockQueryBuilder.getMany.mockResolvedValueOnce(mockTags);

      const result = await service.findMyDelegated({ sub: 'user-1' }, 'tenant-1');
      expect(result).toEqual(mockTags);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
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

  describe('grantAccess / revokeAccess / getDelegations', () => {
    it('should throw ForbiddenException if non-admin tries to grant access', async () => {
      await expect(
        service.grantAccess('tag-1', 'user-2', { sub: 'user-1', role: 'usuario' }, 'tenant-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should grant access to tag successfully if user is admin', async () => {
      mockTagRepo.findOne.mockResolvedValueOnce({ id: 'tag-1', tenantId: 'tenant-1' });
      mockGenericRepo.findOne.mockResolvedValueOnce(null); // no existing access

      const result = await service.grantAccess('tag-1', 'user-2', { sub: 'user-admin', role: 'administrador' }, 'tenant-1');
      expect(result).toBeDefined();
      expect(mockGenericRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if non-admin tries to revoke access', async () => {
      await expect(
        service.revokeAccess('tag-1', 'user-2', { sub: 'user-1', role: 'usuario' }, 'tenant-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should revoke access successfully if user is admin', async () => {
      const mockAccess = { id: 'access-1' };
      mockGenericRepo.findOne.mockResolvedValueOnce(mockAccess);

      await service.revokeAccess('tag-1', 'user-2', { sub: 'user-admin', role: 'administrador' }, 'tenant-1');
      expect(mockGenericRepo.remove).toHaveBeenCalledWith(mockAccess);
    });

    it('should throw ForbiddenException if non-admin tries to get delegations', async () => {
      await expect(
        service.getDelegations('tag-1', { sub: 'user-1', role: 'usuario' }, 'tenant-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return delegations list if user is admin', async () => {
      mockGenericRepo.find.mockResolvedValueOnce([
        {
          createdAt: new Date(),
          user: { id: 'user-2', name: 'Pedro', email: 'pedro@email.com' }
        }
      ]);

      const result = await service.getDelegations('tag-1', { sub: 'user-admin', role: 'administrador' }, 'tenant-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Pedro');
    });
  });
});
