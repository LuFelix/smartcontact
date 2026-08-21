import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { roleGuard } from './role-guard';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  let mockAuthService: any;
  let mockRouter: any;
  let routeSnapshot: ActivatedRouteSnapshot;

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: vi.fn(),
      userRole: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
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
      TestBed.runInInjectionContext(() => roleGuard(route, {} as any));

  it('should navigate to /login if user is not logged in', () => {
    mockAuthService.isLoggedIn.mockReturnValue(false);
    routeSnapshot.data = { roles: ['ADMINISTRADOR'] };

    const result = executeGuard(routeSnapshot);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(false);
  });

  it('should navigate to /login if expected roles is empty', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    routeSnapshot.data = { roles: [] };

    const result = executeGuard(routeSnapshot);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(false);
  });

  it('should return true if user has the expected role', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockAuthService.userRole.mockReturnValue('ADMINISTRADOR');
    routeSnapshot.data = { roles: ['ADMINISTRADOR'] };

    const result = executeGuard(routeSnapshot);

    expect(result).toBe(true);
  });

  it('should navigate to /app/dashboard and return false if user does not have expected role', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockAuthService.userRole.mockReturnValue('MEMBRO');
    routeSnapshot.data = { roles: ['ADMINISTRADOR'] };

    const result = executeGuard(routeSnapshot);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/dashboard']);
    expect(result).toBe(false);
  });
});
