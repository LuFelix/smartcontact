import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { ProfilesService } from 'src/profiles/profiles.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { RolesService } from 'src/roles/roles.service';
import { TenantsService } from 'src/tenants/tenants.service';
import { MembershipsService } from 'src/memberships/memberships.service';
import { TeamService } from 'src/team/team.service';
import { UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: () => ({
          email: 'user@google.com',
          name: 'Google User',
          picture: 'https://google.com/pic.png',
        }),
      }),
    })),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let teamService: TeamService;
  let membershipsService: MembershipsService;

  const mockUsersServ = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByCpf: vi.fn(),
    create: vi.fn(),
    markEmailAsVerified: vi.fn(),
    updateProfilePicture: vi.fn(),
    setVerificationData: vi.fn().mockResolvedValue(undefined),
    provisionPersonalWorkspace: vi.fn().mockImplementation(user => Promise.resolve(user)),
    createMembershipForUser: vi.fn().mockResolvedValue(undefined),
    updateGlobalNameAndVerify: vi.fn(),
  };

  const mockProfilesServ = {
    create: vi.fn(),
  };

  const mockJwtServ = {
    signAsync: vi.fn().mockResolvedValue('jwt_token_123'),
  };

  const mockMailerServ = {
    sendMail: vi.fn().mockResolvedValue(undefined),
  };

  const mockRolesServ = {
    findOneByName: vi.fn().mockResolvedValue({ id: 'role-admin' }),
  };

  const mockTenantsServ = {
    create: vi.fn(),
    findOne: vi.fn(),
  };

  const mockMembershipsServ = {
    create: vi.fn(),
    hasPersonalTenant: vi.fn().mockResolvedValue(true),
    findTeamWorkspacesByUser: vi.fn(),
  };

  const mockTeamServ = {
    resolveInvitation: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersServ },
        { provide: ProfilesService, useValue: mockProfilesServ },
        { provide: JwtService, useValue: mockJwtServ },
        { provide: MailerService, useValue: mockMailerServ },
        { provide: RolesService, useValue: mockRolesServ },
        { provide: TenantsService, useValue: mockTenantsServ },
        { provide: MembershipsService, useValue: mockMembershipsServ },
        { provide: TeamService, useValue: mockTeamServ },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    teamService = module.get<TeamService>(TeamService);
    membershipsService = module.get<MembershipsService>(MembershipsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException if credentials are invalid', async () => {
      mockUsersServ.findByEmail.mockResolvedValueOnce(null);
      await expect(service.login({ identifier: 'user@email.com', password: '123' })).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException if user is not verified', async () => {
      const unverifiedUser = { id: '1', email: 'user@email.com', password: 'hashed', isVerified: false };
      mockUsersServ.findByEmail.mockResolvedValueOnce(unverifiedUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      await expect(service.login({ identifier: 'user@email.com', password: '123' })).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should return access token if login succeeds', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John',
        email: 'john@email.com',
        username: 'john',
        password: 'hashed',
        isVerified: true,
        memberships: [{ tenantId: 'tenant-1', role: { name: 'administrador' } }],
      };
      mockUsersServ.findByEmail.mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      const result = await service.login({ identifier: 'john@email.com', password: 'password123' });
      expect(result).toEqual({ access_token: 'jwt_token_123' });
      expect(jwtService.signAsync).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register new user and return user object', async () => {
      const registrationDto = {
        name: 'New User',
        email: 'new@email.com',
        password: 'password123',
      };
      mockUsersServ.create.mockResolvedValueOnce({ id: 'user-123', email: 'new@email.com' });

      const result = await service.register(registrationDto);
      expect(result).toBeDefined();
      expect(mockUsersServ.create).toHaveBeenCalled();
    });

    it('should resolve invitation if invitationToken is present', async () => {
      const registrationDto = {
        name: 'Invited User',
        email: 'invited@email.com',
        password: 'password123',
        invitationToken: 'token123',
      };
      mockTeamServ.resolveInvitation.mockResolvedValueOnce({ tenantId: 'tenant-invite', roleId: 'role-invite' });
      mockUsersServ.create.mockResolvedValueOnce({ id: 'user-123', email: 'invited@email.com' });

      await service.register(registrationDto);
      expect(mockTeamServ.resolveInvitation).toHaveBeenCalledWith('token123');
      expect(mockUsersServ.create).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 'role-invite' }),
        expect.objectContaining({ tenantId: 'tenant-invite' })
      );
    });
  });

  describe('verifyEmailCode', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersServ.findByEmail.mockResolvedValueOnce(null);
      await expect(service.verifyEmailCode('notfound@email.com', '123456')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should return message if email is already verified', async () => {
      mockUsersServ.findByEmail.mockResolvedValueOnce({ id: 'user-1', isVerified: true });
      const result = await service.verifyEmailCode('verified@email.com', '123456');
      expect(result).toEqual({ message: 'E-mail já está verificado' });
    });

    it('should throw UnauthorizedException if code does not match', async () => {
      mockUsersServ.findByEmail.mockResolvedValueOnce({ id: 'user-1', isVerified: false, verificationCode: '111111' });
      await expect(service.verifyEmailCode('user@email.com', '222222')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException if code is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - 10);
      mockUsersServ.findByEmail.mockResolvedValueOnce({ 
        id: 'user-1', 
        isVerified: false, 
        verificationCode: '123456',
        verificationExpires: expiredDate
      });
      await expect(service.verifyEmailCode('user@email.com', '123456')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should verify email and return success message on valid code', async () => {
      const validDate = new Date();
      validDate.setMinutes(validDate.getMinutes() + 10);
      mockUsersServ.findByEmail.mockResolvedValueOnce({ 
        id: 'user-1', 
        isVerified: false, 
        verificationCode: '123456',
        verificationExpires: validDate
      });

      const result = await service.verifyEmailCode('user@email.com', '123456');
      expect(result).toEqual({ message: 'E-mail verificado com sucesso. Você já pode fazer login.' });
      expect(mockUsersServ.markEmailAsVerified).toHaveBeenCalledWith('user-1');
    });
  });

  describe('loginWithGoogle', () => {
    it('should login and return jwt for existing google user', async () => {
      const mockUser = {
        id: 'google-user-123',
        name: 'Google User',
        email: 'user@google.com',
        username: 'googleuser',
        ownerId: 'google-user-123',
        isVerified: true,
        memberships: [
          {
            tenantId: 'tenant-personal',
            role: { name: 'administrador' },
            tenant: { ownerId: 'google-user-123' },
          },
        ],
      };
      mockUsersServ.findByEmail.mockResolvedValue(mockUser);
      mockMembershipsServ.findTeamWorkspacesByUser.mockResolvedValueOnce([
        {
          tenantId: 'tenant-personal',
          role: { name: 'administrador' },
          tenant: { slug: 'ws-google-user-123', ownerId: 'google-user-123' },
          profile: { profilePictureUrl: 'https://google.com/pic.png' },
        },
      ]);

      const result = await service.loginWithGoogle({ token: 'google_token' });
      expect(result).toEqual({ access_token: 'jwt_token_123' });
      expect(mockUsersServ.findByEmail).toHaveBeenCalledWith('user@google.com');
    });

    it('should provision personal workspace and login new user if google user does not exist', async () => {
      mockUsersServ.findByEmail.mockResolvedValueOnce(null);
      mockUsersServ.create.mockResolvedValueOnce({ id: 'new-google-user', email: 'user@google.com' });
      mockUsersServ.findByEmail.mockResolvedValue({
        id: 'new-google-user',
        email: 'user@google.com',
        username: 'usergoogle',
        ownerId: 'new-google-user',
        isVerified: true,
        memberships: [],
      });
      mockMembershipsServ.findTeamWorkspacesByUser.mockResolvedValueOnce([
        {
          tenantId: 'tenant-new',
          role: { name: 'administrador' },
          tenant: { slug: 'ws-new-google-user', ownerId: 'new-google-user' }
        }
      ]);

      const result = await service.loginWithGoogle({ token: 'google_token' });
      expect(result).toEqual({ access_token: 'jwt_token_123' });
      expect(mockUsersServ.create).toHaveBeenCalled();
    });

    it('should update profile picture if different from google picture', async () => {
      const mockUser = {
        id: 'google-user-123',
        name: 'Google User',
        email: 'user@google.com',
        profilePictureUrl: 'old_pic.png',
        ownerId: 'google-user-123',
        isVerified: true,
        memberships: [
          {
            tenantId: 'tenant-personal',
            role: { name: 'administrador' },
            tenant: { ownerId: 'google-user-123' },
          },
        ],
      };
      mockUsersServ.findByEmail.mockResolvedValue(mockUser);
      mockMembershipsServ.findTeamWorkspacesByUser.mockResolvedValueOnce([
        {
          tenantId: 'tenant-personal',
          role: { name: 'administrador' },
          tenant: { slug: 'ws-google-user-123', ownerId: 'google-user-123' }
        }
      ]);

      await service.loginWithGoogle({ token: 'google_token' });
      expect(mockUsersServ.updateProfilePicture).toHaveBeenCalledWith('google-user-123', 'https://google.com/pic.png');
    });

    it('should assign user to membership if user has a pending invitation and is existing', async () => {
      const mockUser = {
        id: 'google-user-123',
        name: 'Google User',
        email: 'user@google.com',
        profilePictureUrl: 'https://google.com/pic.png',
        ownerId: 'google-user-123',
        isVerified: true,
        memberships: [],
      };
      mockUsersServ.findByEmail.mockResolvedValue(mockUser);
      mockTeamServ.resolveInvitation.mockResolvedValueOnce({ tenantId: 'tenant-invited', roleId: 'role-invited' });
      mockMembershipsServ.findTeamWorkspacesByUser.mockResolvedValueOnce([
        {
          tenantId: 'tenant-invited',
          role: { name: 'colaborador' },
          tenant: { slug: 'tenant-invited', ownerId: 'admin-owner' }
        }
      ]);

      await service.loginWithGoogle({ token: 'google_token', invitationToken: 'invite-123' });
      expect(teamService.resolveInvitation).toHaveBeenCalledWith('invite-123');
      expect(usersService.createMembershipForUser).toHaveBeenCalledWith('google-user-123', 'tenant-invited', 'role-invited');
    });

    it('should update user name and verify if user exists but is unverified (first real login)', async () => {
      const mockUser = {
        id: 'google-user-123',
        name: 'Borracheiro João',
        email: 'user@google.com',
        ownerId: 'some-other-id',
        isVerified: false,
        memberships: [],
      };
      mockUsersServ.findByEmail.mockResolvedValue(mockUser);
      mockMembershipsServ.findTeamWorkspacesByUser.mockResolvedValueOnce([
        {
          tenantId: 'tenant-personal',
          role: { name: 'administrador' },
          tenant: { slug: 'ws-google-user-123', ownerId: 'google-user-123' }
        }
      ]);

      await service.loginWithGoogle({ token: 'google_token' });
      expect(mockUsersServ.updateGlobalNameAndVerify).toHaveBeenCalledWith('google-user-123', 'Google User');
    });

    it('should NOT update user name if user exists and is already verified', async () => {
      const mockUser = {
        id: 'google-user-123',
        name: 'João Silva',
        email: 'user@google.com',
        ownerId: 'google-user-123',
        isVerified: true,
        memberships: [],
      };
      mockUsersServ.findByEmail.mockResolvedValue(mockUser);
      mockMembershipsServ.findTeamWorkspacesByUser.mockResolvedValueOnce([
        {
          tenantId: 'tenant-personal',
          role: { name: 'administrador' },
          tenant: { slug: 'ws-google-user-123', ownerId: 'google-user-123' }
        }
      ]);

      await service.loginWithGoogle({ token: 'google_token' });
      expect(mockUsersServ.updateGlobalNameAndVerify).not.toHaveBeenCalled();
    });

  describe('getWorkspaces', () => {
    it('should map isOwner correctly based on tenant ownerId', async () => {
      const mockUser = { id: 'user-123', name: 'John Doe' };
      mockUsersServ.findByEmail.mockResolvedValueOnce(mockUser);
      
      const mockWorkspaces = [
        {
          tenantId: 'tenant-1',
          role: { name: 'administrador' },
          tenant: { name: 'My Workspace', ownerId: 'user-123' },
          profile: { ownerId: 'user-123' }
        },
        {
          tenantId: 'tenant-2',
          role: { name: 'membro' },
          tenant: { name: 'Shared Workspace', ownerId: 'other-user' },
          profile: { ownerId: 'user-123' } // Profile belongs to user, but tenant does not
        }
      ];
      mockMembershipsServ.findTeamWorkspacesByUser.mockResolvedValueOnce(mockWorkspaces);

      const result = await service.getMyWorkspaces('user-123');
      
      expect(result).toHaveLength(2);
      expect(result[0].isOwner).toBe(true);
      expect(result[1].isOwner).toBe(false);
    });
  });
  });
});
