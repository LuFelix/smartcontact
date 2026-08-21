import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { MembershipsService } from 'src/memberships/memberships.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let membershipsService: MembershipsService;

  const mockConfigService = {
    get: vi.fn().mockReturnValue('mock_secret_key_123'),
  };

  const mockMembershipsService = {
    findByUserAndTenant: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MembershipsService, useValue: mockMembershipsService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    membershipsService = module.get<MembershipsService>(MembershipsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return payload for Super Admin directly', async () => {
      const mockReq = { headers: {} };
      const mockPayload = {
        sub: 'admin-123',
        name: 'Super Admin',
        role: 'administrador',
        isSuperAdmin: true,
        tenantId: 'tenant-1',
      };

      const result = await strategy.validate(mockReq, mockPayload);
      expect(result).toBeDefined();
      expect(result.isSuperAdmin).toBe(true);
      expect(result.sub).toBe('admin-123');
    });

    it('should validate and return dynamic role for normal user with tenant membership', async () => {
      const mockReq = { headers: { 'x-tenant-id': 'tenant-active' } };
      const mockPayload = {
        sub: 'user-123',
        name: 'Normal User',
        role: 'usuario',
        isSuperAdmin: false,
      };

      mockMembershipsService.findByUserAndTenant.mockResolvedValueOnce({
        role: { name: 'colaborador' },
      });

      const result = await strategy.validate(mockReq, mockPayload);
      expect(result).toBeDefined();
      expect(result.role).toBe('colaborador'); // dynamic role
      expect(result.tenantId).toBe('tenant-active');
      expect(membershipsService.findByUserAndTenant).toHaveBeenCalledWith('user-123', 'tenant-active');
    });

    it('should allow self-ownership bypass for users own profile even without tenant membership', async () => {
      const mockReq = { 
        headers: { 'x-tenant-id': 'tenant-active' },
        url: '/api/users/user-123'
      };
      const mockPayload = {
        sub: 'user-123',
        name: 'Normal User',
        role: 'usuario',
        isSuperAdmin: false,
        tenantId: 'tenant-personal',
      };

      mockMembershipsService.findByUserAndTenant.mockResolvedValueOnce(null);

      const result = await strategy.validate(mockReq, mockPayload);
      expect(result).toBeDefined();
      expect(result.sub).toBe('user-123');
      expect(result.tenantId).toBe('tenant-personal'); // falls back to payload tenant
    });

    it('should throw UnauthorizedException if normal user has no membership in tenant', async () => {
      const mockReq = { 
        headers: { 'x-tenant-id': 'tenant-other' },
        url: '/api/tags/resolve'
      };
      const mockPayload = {
        sub: 'user-123',
        name: 'Normal User',
        role: 'usuario',
        isSuperAdmin: false,
      };

      mockMembershipsService.findByUserAndTenant.mockResolvedValueOnce(null);

      await expect(strategy.validate(mockReq, mockPayload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
