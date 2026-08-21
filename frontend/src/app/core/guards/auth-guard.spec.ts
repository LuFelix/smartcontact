import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let mockAuthService: any;
  let mockRouter: any;
  let routeSnapshot: ActivatedRouteSnapshot;

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: vi.fn(),
      hasPermission: vi.fn(),
    };

    mockRouter = {
      createUrlTree: vi.fn().mockImplementation((path: string[]) => {
        return { path } as unknown as UrlTree;
      }),
    };

    routeSnapshot = {
      data: {}
    } as unknown as ActivatedRouteSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ]
    });
  });

  const executeGuard = (route: ActivatedRouteSnapshot) => 
      TestBed.runInInjectionContext(() => authGuard(route, {} as any));

  it('should redirect to /login if user is not logged in', () => {
    mockAuthService.isLoggedIn.mockReturnValue(false);

    const result = executeGuard(routeSnapshot);

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ path: ['/login'] } as any);
  });

  it('should redirect to /unauthorized if route requires permission and user does not have it', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockAuthService.hasPermission.mockReturnValue(false);
    routeSnapshot.data = { permission: 'ADMIN_ACCESS' };

    const result = executeGuard(routeSnapshot);

    expect(mockAuthService.hasPermission).toHaveBeenCalledWith('ADMIN_ACCESS');
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
    expect(result).toEqual({ path: ['/unauthorized'] } as any);
  });

  it('should return true if route requires permission and user has it', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockAuthService.hasPermission.mockReturnValue(true);
    routeSnapshot.data = { permission: 'ADMIN_ACCESS' };

    const result = executeGuard(routeSnapshot);

    expect(mockAuthService.hasPermission).toHaveBeenCalledWith('ADMIN_ACCESS');
    expect(result).toBe(true);
  });

  it('should return true if route does not require permission and user is logged in', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    routeSnapshot.data = {};

    const result = executeGuard(routeSnapshot);

    expect(mockAuthService.hasPermission).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
