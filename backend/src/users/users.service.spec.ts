import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { UserResourcePermission } from './entities/user-resource-permission.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { RolesService } from 'src/roles/roles.service';
import { ProfilesService } from 'src/profiles/profiles.service';
import { TagsService } from 'src/tags/tags.service';
import { MembershipsService } from '../memberships/memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;
  let tagRepository: Repository<Tag>;

  const mockQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
  };

  const mockUserRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn(),
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockTagRepo = {
    findOne: vi.fn(),
    save: vi.fn(),
  };

  const mockGenericRepo = {
    findOne: vi.fn(),
    save: vi.fn(),
  };

  const mockRolesServ = {
    findByName: vi.fn(),
  };

  const mockProfilesServ = {
    create: vi.fn(),
  };

  const mockTagsServ = {
    createDefaultTag: vi.fn(),
  };

  const mockMembershipsServ = {
    create: vi.fn(),
  };

  const mockTenantsServ = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepo,
        },
        {
          provide: getRepositoryToken(UserResourcePermission),
          useValue: mockGenericRepo,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockGenericRepo,
        },
        {
          provide: RolesService,
          useValue: mockRolesServ,
        },
        {
          provide: ProfilesService,
          useValue: mockProfilesServ,
        },
        {
          provide: TagsService,
          useValue: mockTagsServ,
        },
        {
          provide: MembershipsService,
          useValue: mockMembershipsServ,
        },
        {
          provide: TenantsService,
          useValue: mockTenantsServ,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tagRepository = module.get<Repository<Tag>>(getRepositoryToken(Tag));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateUniqueUsername', () => {
    it('should clean and convert username properly', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      const username = await service.generateUniqueUsername('Luís Félipe!');
      expect(username).toBe('luisfelipe');
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { username: 'luisfelipe' } });
    });

    it('should append sequential number in case of collision', async () => {
      mockUserRepo.findOne
        .mockResolvedValueOnce({ id: '1' }) // first check: exists
        .mockResolvedValueOnce(null);       // second check: free
      const username = await service.generateUniqueUsername('teste');
      expect(username).toBe('teste1');
      expect(mockUserRepo.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('findById', () => {
    it('should return null if user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.findById('invalid-id');
      expect(result).toBeNull();
    });

    it('should bypass rules if the user is requesting their own profile', async () => {
      const user = { id: 'user-123', memberships: [] } as any;
      mockUserRepo.findOne.mockResolvedValueOnce(user);
      mockQueryBuilder.getOne.mockResolvedValueOnce(user);
      const result = await service.findById('user-123', { sub: 'user-123' });
      expect(result).toEqual(user);
    });

    it('should throw BadRequestException if requesting profile outside their organization', async () => {
      const user = { id: 'user-123', memberships: [{ tenantId: 'tenant-A' }] } as any;
      mockUserRepo.findOne.mockResolvedValueOnce(user);
      await expect(
        service.findById('user-123', { sub: 'other-user', tenantId: 'tenant-B' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.update('invalid', {})).rejects.toThrow(NotFoundException);
    });

    it('should update specific tag using tags array by ID', async () => {
      const existingUser = {
        id: 'user-123',
        ownerId: 'user-123',
        tags: [
          { id: 'tag-personal', isResource: false, tenantId: 'tenant-1' },
          { id: 'tag-resource', isResource: true, tenantId: 'tenant-1' },
        ],
      } as any;

      mockUserRepo.findOne.mockResolvedValueOnce(existingUser);
      mockUserRepo.findOne.mockResolvedValueOnce(existingUser);
      mockUserRepo.merge.mockImplementation((dest, src) => Object.assign(dest, src));

      const payload = {
        tags: [
          { id: 'tag-resource', nfcRedirectMode: 'custom', nfcCustomUrl: 'https://newurl.com' },
        ],
      };

      await service.update('user-123', payload, { sub: 'user-123', tenantId: 'tenant-1' });

      expect(tagRepository.save).toHaveBeenCalledTimes(1);
      expect(tagRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tag-resource',
          nfcRedirectMode: 'custom',
          nfcCustomUrl: 'https://newurl.com',
        })
      );
    });

    it('should update personal tag when properties are sent in the root DTO', async () => {
      const existingUser = {
        id: 'user-123',
        ownerId: 'user-123',
        tags: [
          { id: 'tag-personal', isResource: false, tenantId: 'tenant-1' },
          { id: 'tag-resource', isResource: true, tenantId: 'tenant-1' },
        ],
      } as any;

      mockUserRepo.findOne.mockResolvedValueOnce(existingUser);
      mockUserRepo.findOne.mockResolvedValueOnce(existingUser);
      mockUserRepo.merge.mockImplementation((dest, src) => Object.assign(dest, src));

      const payload = {
        nfcRedirectMode: 'custom',
        nfcCustomUrl: 'https://personalurl.com',
      };

      await service.update('user-123', payload, { sub: 'user-123', tenantId: 'tenant-1' });

      expect(tagRepository.save).toHaveBeenCalledTimes(1);
      expect(tagRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tag-personal',
          nfcRedirectMode: 'custom',
          nfcCustomUrl: 'https://personalurl.com',
        })
      );
    });
  });
});
