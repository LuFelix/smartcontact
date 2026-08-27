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
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;
  let tagRepository: Repository<Tag>;
  let rolesRepository: Repository<Role>;
  let membershipsService: MembershipsService;
  let tenantsService: TenantsService;
  let profilesService: ProfilesService;
  let tagsService: TagsService;

  const mockQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    setParameter: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
    getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
  };

  const mockUserRepo = {
    findOne: vi.fn().mockImplementation((options) => {
      if (options?.where?.id === 'invalid') {
        return Promise.resolve(null);
      }
      if (options?.where?.id === 'user-1') {
        return Promise.resolve({
          id: 'user-1',
          email: 'john@email.com',
          name: 'John Doe',
          ownerId: 'user-admin',
          memberships: [{ tenantId: 'tenant-1' }]
        });
      }
      if (options?.where?.email) {
        return Promise.resolve({ 
          id: 'user-123', 
          email: options.where.email, 
          name: 'John Doe', 
          ownerId: 'user-123', 
          memberships: [{ tenantId: 'tenant-1', role: { name: 'administrador' } }] 
        });
      }
      if (options?.where?.username) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    }),
    find: vi.fn(),
    create: vi.fn().mockImplementation(dto => dto),
    save: vi.fn().mockImplementation(user => Promise.resolve({ id: 'user-123', ...user })),
    merge: vi.fn(),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    delete: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockTagRepo = {
    findOne: vi.fn(),
    save: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  const mockGenericRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
    create: vi.fn().mockImplementation(dto => dto),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  const mockRolesServ = {
    findOne: vi.fn(),
    findOneByName: vi.fn(),
  };

  const mockProfilesServ = {
    create: vi.fn().mockResolvedValue({ id: 'profile-new' }),
    findByUserIdAndTenant: vi.fn().mockResolvedValue(null),
    removeByUserIdAndTenant: vi.fn().mockResolvedValue(undefined),
  };

  const mockTagsServ = {
    createDefaultTag: vi.fn(),
  };

  const mockMembershipsServ = {
    create: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined),
    findByUserAndTenant: vi.fn(),
    updateRoleAndProfile: vi.fn().mockResolvedValue(undefined),
    updateRole: vi.fn().mockResolvedValue(undefined),
    updateProfileId: vi.fn().mockResolvedValue(undefined),
  };

  const mockTenantsServ = {
    create: vi.fn().mockResolvedValue({ id: 'tenant-new', name: 'New Tenant' }),
    findOne: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
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
    rolesRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    membershipsService = module.get<MembershipsService>(MembershipsService);
    tenantsService = module.get<TenantsService>(TenantsService);
    profilesService = module.get<ProfilesService>(ProfilesService);
    tagsService = module.get<TagsService>(TagsService);
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

  describe('create', () => {
    it('should throw BadRequestException if email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ id: '1', email: 'existing@email.com' });
      await expect(
        service.create({ email: 'existing@email.com', name: 'John' } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if password is sent but email is missing', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null); // email not exists
      await expect(
        service.create({ password: '123', name: 'John' } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if CPF already exists', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null); // email free
      mockUserRepo.findOne.mockResolvedValueOnce({ id: '1', cpf: '12345678901' }); // cpf exists
      await expect(
        service.create({ email: 'john@email.com', cpf: '12345678901', name: 'John' } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should register successfully and provision a new tenant on auto-registration', async () => {
      mockUserRepo.findOne
        .mockResolvedValueOnce(null) // email free
        .mockResolvedValueOnce(null) // cpf free
        .mockResolvedValueOnce(null) // unique username check free
        .mockResolvedValueOnce({ id: 'user-123', email: 'john@email.com' }); // findByEmail check
      mockGenericRepo.findOne.mockResolvedValueOnce({ id: 'role-1', name: 'usuario' }); // default role

      const result = await service.create({
        email: 'john@email.com',
        name: 'John',
        password: 'Password@123',
      } as any);

      expect(result).toBeDefined();
      expect(mockTenantsServ.create).toHaveBeenCalled();
      expect(usersRepository.save).toHaveBeenCalled();
    });
  });

  describe('findByCpf / findByEmail / findByUsername', () => {
    it('should find user by email', async () => {
      const mockUser = { id: 'user-1', email: 'john@email.com' };
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.findByEmail('john@email.com');
      expect(result).toEqual(mockUser);
    });

    it('should find user by cpf', async () => {
      const mockUser = { id: 'user-1', cpf: '12345678901' };
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.findByCpf('123.456.789-01');
      expect(result).toEqual(mockUser);
    });

    it('should find user by username', async () => {
      const mockUser = { id: 'user-1', username: 'john' };
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.findByUsername('john');
      expect(result).toEqual(mockUser);
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

  describe('findAll', () => {
    it('should throw ForbiddenException if user has no membership in tenant', async () => {
      mockMembershipsServ.findByUserAndTenant.mockResolvedValueOnce(null);
      await expect(
        service.findAll(1, 10, '', '', '', { sub: 'user-1', tenantId: 'tenant-active' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated list of users', async () => {
      mockMembershipsServ.findByUserAndTenant.mockResolvedValueOnce({ id: 'membership-1' });
      const mockUsers = [{ id: 'user-1', name: 'John Doe', memberships: [{ tenantId: 'tenant-active' }] }];
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([mockUsers, 1]);

      const result = await service.findAll(1, 10, 'John', '', '', { sub: 'user-1', tenantId: 'tenant-active', role: 'administrador' });
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
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

  describe('promoteToTeam / demoteFromTeam', () => {
    it('should throw NotFoundException if user to promote does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.promoteToTeam('invalid', 'role-1', { role: 'administrador' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if non-admin tries to promote', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 'user-1' });
      await expect(
        service.promoteToTeam('user-1', 'role-1', { role: 'usuario' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should promote user successfully if requested by admin', async () => {
      const mockUser = { id: 'user-1', email: 'john@email.com', memberships: [] };
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockRolesServ.findOne.mockResolvedValueOnce({ id: 'role-colaborador', name: 'colaborador' });
      mockProfilesServ.findByUserIdAndTenant.mockResolvedValueOnce(null); // profile free
      mockTagRepo.findOne.mockResolvedValueOnce(null); // tag check free
      
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.promoteToTeam('user-1', 'role-colaborador', { role: 'administrador', tenantId: 'tenant-1' });
      expect(result).toBeDefined();
      expect(mockProfilesServ.create).toHaveBeenCalled();
      expect(mockTagsServ.createDefaultTag).toHaveBeenCalled();
    });

    it('should throw BadRequestException if non-admin tries to demote', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 'user-1' });
      await expect(
        service.demoteFromTeam('user-1', { role: 'usuario' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should demote user successfully if requested by admin', async () => {
      const mockUser = { id: 'user-1', memberships: [{ tenantId: 'tenant-1' }] };
      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockRolesServ.findOneByName.mockResolvedValueOnce({ id: 'role-contato', name: 'contato' });

      await service.demoteFromTeam('user-1', { role: 'administrador', tenantId: 'tenant-1' });
      expect(mockMembershipsServ.updateRole).toHaveBeenCalled();
      expect(mockMembershipsServ.updateProfileId).toHaveBeenCalledWith('user-1', 'tenant-1', null);
      expect(mockTagRepo.delete).toHaveBeenCalled();
    });
  });

  describe('getUserTags / updateUserTags', () => {
    it('should get user tags', async () => {
      mockGenericRepo.find.mockResolvedValueOnce([
        { tagId: 'tag-1' },
        { tagId: 'tag-2' },
      ]);

      const result = await service.getUserTags('user-1', { tenantId: 'tenant-1' });
      expect(result).toEqual(['tag-1', 'tag-2']);
    });

    it('should throw ForbiddenException if non-admin tries to update user tags', async () => {
      await expect(
        service.updateUserTags('user-1', ['tag-1'], { role: 'usuario' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update user tags successfully if requested by admin', async () => {
      await service.updateUserTags('user-1', ['tag-1', 'tag-2'], { role: 'administrador', tenantId: 'tenant-1' });
      expect(mockGenericRepo.delete).toHaveBeenCalledWith({ userId: 'user-1', tenantId: 'tenant-1' });
      expect(mockGenericRepo.save).toHaveBeenCalled();
    });
  });

  describe('provisioning & picture helpers', () => {
    it('should update profile picture successfully', async () => {
      await service.updateProfilePicture('user-1', 'new_pic.png');
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { profilePictureUrl: 'new_pic.png' });
    });

    it('should ensure user has default tag', async () => {
      const mockUser = { id: 'user-1', ownerId: 'user-1', memberships: [{ tenantId: 'tenant-1' }] } as any;
      mockTagRepo.findOne.mockResolvedValueOnce(null); // tag not exists

      await service.ensureHasDefaultTag(mockUser);
      expect(mockTagsServ.createDefaultTag).toHaveBeenCalledWith('user-1', 'user-1', 'tenant-1');
    });

    it('should migrate usernames for users without one', async () => {
      mockUserRepo.find.mockResolvedValueOnce([
        { id: 'user-1', name: 'John Doe', username: null },
      ]);
      mockUserRepo.findOne.mockResolvedValueOnce(null); // username check free

      await service.migrateUsernames();
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { username: 'johndoe' });
    });

    it('should handle unique constraint conflict on workspace provisioning by retrying find', async () => {
      const mockUser = { id: 'user-1', email: 'john@email.com', ownerId: 'user-1' } as any;
      mockTenantsServ.create.mockRejectedValueOnce({ code: '23505', message: 'unique constraint error' });

      const result = await service.provisionPersonalWorkspace(mockUser);
      expect(result).toBeDefined();
      expect(mockUserRepo.findOne).toHaveBeenCalled();
    });

    it('should rollback personal workspace creation if optimistic lock fails', async () => {
      const mockUser = { id: 'user-1', email: 'john@email.com', ownerId: 'other-id' } as any;
      mockTenantsServ.create.mockResolvedValueOnce({ id: 'tenant-new', name: 'New Tenant' });
      mockRolesServ.findOneByName.mockResolvedValueOnce({ id: 'role-admin' });
      mockProfilesServ.findByUserIdAndTenant.mockResolvedValueOnce({ id: 'profile-1' });
      
      // mock the update resulting in 0 affected rows (optimistic lock failure)
      mockUserRepo.update.mockResolvedValueOnce({ affected: 0 });

      const result = await service.provisionPersonalWorkspace(mockUser);
      expect(result).toBeDefined();
      expect(mockMembershipsServ.remove).toHaveBeenCalled();
      expect(mockProfilesServ.removeByUserIdAndTenant).toHaveBeenCalled();
    });
  });

  describe('verification and helpers', () => {
    it('should save verification data', async () => {
      const expires = new Date();
      await service.setVerificationData('user-1', '123456', expires);

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        verificationCode: '123456',
        verificationExpires: expires,
      });
    });

    it('should mark email as verified', async () => {
      await service.markEmailAsVerified('user-1');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', {
        isVerified: true,
        verificationCode: null,
        verificationExpires: null,
      });
    });

    it('should remove user successfully', async () => {
      const result = await service.remove('user-1', { isSuperAdmin: true });
      expect(result).toEqual({ message: 'Usuário com ID user-1 foi removido com sucesso.' });
      expect(mockUserRepo.delete).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException if user to remove does not exist', async () => {
      await expect(service.remove('invalid', { isSuperAdmin: true })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user to remove belongs to another tenant', async () => {
      await expect(
        service.remove('user-1', { isSuperAdmin: false, tenantId: 'tenant-active' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if requester has no permission to remove user', async () => {
      await expect(
        service.remove('user-1', { isSuperAdmin: false, sub: 'not-owner', tenantId: 'tenant-1' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Issue #267 - Colisão de Tags no Perfil', () => {
    it('should query user tags including personal tag of another tenant in findById', async () => {
      const mockUser = {
        id: 'user-1',
        memberships: [{ tenantId: 'tenant-b2b', role: { name: 'administrador' } }],
        tags: [
          { id: 'tag-1', isResource: false, tenantId: 'tenant-solo' },
          { id: 'tag-2', isResource: true, tenantId: 'tenant-b2b' }
        ]
      } as any;

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockUser);

      const result = await service.findById('user-1', { tenantId: 'tenant-b2b', role: 'administrador', sub: 'user-1' });
      expect(result).toBeDefined();
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'user.tags',
        'tag',
        'tag.tenantId = :tenantId',
        expect.any(Object)
      );
    });

    it('should prioritize personal tag of any tenant when updating redirect settings via root DTO', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'john@email.com',
        memberships: [{ tenantId: 'tenant-b2b' }],
        tags: [
          { id: 'tag-resource', isResource: true, tenantId: 'tenant-b2b', qrRedirectMode: 'PROFILE' },
          { id: 'tag-personal', isResource: false, tenantId: 'tenant-solo', qrRedirectMode: 'PROFILE' }
        ]
      } as any;

      mockUserRepo.findOne.mockResolvedValueOnce(existingUser);

      const updateDto = {
        qrRedirectMode: 'CUSTOM_URL' as any,
        qrCustomUrl: 'https://redirect-me.com'
      };

      await service.update('user-1', updateDto, { sub: 'user-1', tenantId: 'tenant-b2b' });

      expect(mockTagRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tag-personal',
          qrRedirectMode: 'CUSTOM_URL',
          qrCustomUrl: 'https://redirect-me.com'
        })
      );
    });
  });

  describe('Issue #270 - Lazy-Create Personal Tag in findById', () => {
    it('should lazy create personal default tag if user has no personal tag in the current active tenant', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@email.com',
        memberships: [{ tenantId: 'tenant-b2b', role: { name: 'administrador' } }]
      } as any;

      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockTagRepo.findOne.mockResolvedValueOnce(null);
      vi.spyOn(mockTagsServ, 'createDefaultTag').mockResolvedValueOnce({} as any);

      await service.findById('user-1', { tenantId: 'tenant-b2b', sub: 'user-1' });

      expect(mockTagRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', tenantId: 'tenant-b2b', isResource: false }
      });
      expect(mockTagsServ.createDefaultTag).toHaveBeenCalledWith('user-1', 'user-1', 'tenant-b2b');
    });

    it('should NOT create personal default tag if user already has a personal tag in the current active tenant', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@email.com',
        memberships: [{ tenantId: 'tenant-b2b', role: { name: 'administrador' } }]
      } as any;

      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockTagRepo.findOne.mockResolvedValueOnce({ id: 'tag-1' } as any);
      vi.spyOn(mockTagsServ, 'createDefaultTag');

      await service.findById('user-1', { tenantId: 'tenant-b2b', sub: 'user-1' });

      expect(mockTagRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', tenantId: 'tenant-b2b', isResource: false }
      });
      expect(mockTagsServ.createDefaultTag).not.toHaveBeenCalled();
    });

    it('should fallback to personal profile (dono) if the active membership profile is missing in findById', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@email.com',
        memberships: [
          { 
            tenantId: 'tenant-b2b', 
            role: { name: 'usuario' },
            profile: null,
            tenant: { ownerId: 'user-admin' }
          },
          { 
            tenantId: 'tenant-solo', 
            role: { name: 'administrador' },
            profile: { id: 'profile-solo', bio: 'Solo Profile Bio' },
            tenant: { ownerId: 'user-1' } // Solo Tenant! (ownerId === user.id)
          }
        ]
      } as any;

      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockTagRepo.findOne.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockUser);

      const result = await service.findById('user-1', { tenantId: 'tenant-b2b', sub: 'user-1' });

      expect(result).toBeDefined();
      expect((result as any).profile).toEqual({ id: 'profile-solo', bio: 'Solo Profile Bio' });
    });
  });

  describe('Issue #270 - Refinamento Dono vs Membros', () => {
    it('should NOT lazy create personal tag and query the Solo Tenant tag if the user is the owner of the Workspace context in findById', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@email.com',
        memberships: [{ tenantId: 'tenant-b2b', role: { name: 'administrador' } }]
      } as any;

      mockUserRepo.findOne.mockResolvedValueOnce(mockUser);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockUser);
      vi.spyOn(mockTagsServ, 'createDefaultTag');

      mockGenericRepo.findOne
        .mockResolvedValueOnce({ id: 'tenant-b2b', ownerId: 'user-1' })
        .mockResolvedValueOnce({ id: 'tenant-solo', ownerId: 'user-1' });

      await service.findById('user-1', { tenantId: 'tenant-b2b', sub: 'user-1' });

      expect(mockTagsServ.createDefaultTag).not.toHaveBeenCalled();
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'user.tags',
        'tag',
        'tag.tenantId = :tenantId',
        expect.objectContaining({ tenantId: 'tenant-solo' })
      );
    });

    it('should update the Solo Tenant tag redirect settings if the user is the owner of the Workspace context in update', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'john@email.com',
        memberships: [{ tenantId: 'tenant-b2b' }],
        tags: [
          { id: 'tag-solo', isResource: false, tenantId: 'tenant-solo', qrRedirectMode: 'PROFILE' },
          { id: 'tag-b2b', isResource: false, tenantId: 'tenant-b2b', qrRedirectMode: 'PROFILE' }
        ]
      } as any;

      mockUserRepo.findOne.mockResolvedValueOnce(existingUser);

      mockGenericRepo.findOne
        .mockResolvedValueOnce({ id: 'tenant-b2b', ownerId: 'user-1' })
        .mockResolvedValueOnce({ id: 'tenant-solo', ownerId: 'user-1' });

      const updateDto = {
        qrRedirectMode: 'CUSTOM_URL' as any,
        qrCustomUrl: 'https://dono-redirect.com'
      };

      await service.update('user-1', updateDto, { sub: 'user-1', tenantId: 'tenant-b2b' });

      expect(mockTagRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tag-solo',
          qrRedirectMode: 'CUSTOM_URL',
          qrCustomUrl: 'https://dono-redirect.com'
        })
      );
    });
  });
});

