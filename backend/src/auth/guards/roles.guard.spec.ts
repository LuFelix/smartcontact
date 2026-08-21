import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const createMockExecutionContext = (userRole: string | undefined, requiredRoles: string[] | undefined): ExecutionContext => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(requiredRoles);

    const mockRequest = {
      user: userRole ? { role: userRole } : null,
      url: '/test-url',
    };

    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no roles are required', () => {
    const context = createMockExecutionContext('usuario', undefined);
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if user has the required role (case-insensitive)', () => {
    const context = createMockExecutionContext('Administrador', ['administrador']);
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user has a different role', () => {
    const context = createMockExecutionContext('usuario', ['administrador']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user has no role defined', () => {
    const context = createMockExecutionContext(undefined, ['administrador']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
