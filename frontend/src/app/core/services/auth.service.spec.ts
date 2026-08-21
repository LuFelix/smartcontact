import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { jwtDecode } from 'jwt-decode';
import { firstValueFrom } from 'rxjs';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(() => ({
    sub: 'user-123',
    email: 'john@email.com',
    name: 'John Doe',
    role: 'administrador',
    tenantId: 'tenant-1'
  }))
}));

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let mockRouter: any;
  let mockSocialAuthService: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockSocialAuthService = {
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: SocialAuthService, useValue: mockSocialAuthService },
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('initialization', () => {
    it('should load token and active tenant from localStorage on startup', () => {
      localStorage.setItem('auth_token', 'valid-token');
      localStorage.setItem('active_tenant_id', 'tenant-2');

      const service = TestBed.inject(AuthService);

      expect(service.isLoggedIn()).toBe(true);
      expect(service.userEmail()).toBe('john@email.com');
      expect(service.activeTenantId()).toBe('tenant-2');
    });

    it('should clear token and logout on invalid token in localStorage', () => {
      localStorage.setItem('auth_token', 'invalid-token');
      (jwtDecode as any).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const service = TestBed.inject(AuthService);

      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('login', () => {
    it('should authenticate successfully and set session', async () => {
      const service = TestBed.inject(AuthService);
      const loginResp = { access_token: 'token-resp' };
      const credentials = { email: 'john@email.com', password: 'Password@123' };

      const promise = firstValueFrom(service.login(credentials));

      const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush(loginResp);

      const response = await promise;
      expect(response).toEqual(loginResp);
      expect(service.isLoggedIn()).toBe(true);
      expect(service.userEmail()).toBe('john@email.com');
      expect(localStorage.getItem('auth_token')).toBe('token-resp');
    });

    it('should clear session and logout on login error', async () => {
      const service = TestBed.inject(AuthService);
      const credentials = { email: 'john@email.com', password: 'wrong' };

      const promise = firstValueFrom(service.login(credentials));

      const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      await expect(promise).rejects.toThrow();
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear storage and reset signals on logout', () => {
      localStorage.setItem('auth_token', 'token');
      localStorage.setItem('active_tenant_id', 'tenant-1');

      const service = TestBed.inject(AuthService);
      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('active_tenant_id')).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      expect(mockSocialAuthService.signOut).toHaveBeenCalled();
    });
  });

  describe('register / email verification', () => {
    it('should call register endpoint', async () => {
      const service = TestBed.inject(AuthService);
      const regData = { name: 'New', email: 'new@email.com', password: '123' };

      const promise = firstValueFrom(service.register(regData));

      const req = httpMock.expectOne('http://localhost:3000/api/auth/register');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });

      const res = await promise;
      expect(res).toBeDefined();
    });

    it('should call verifyEmailCode endpoint', async () => {
      const service = TestBed.inject(AuthService);
      const payload = { email: 'john@email.com', code: '123456' };

      const promise = firstValueFrom(service.verifyEmailCode(payload));

      const req = httpMock.expectOne('http://localhost:3000/api/auth/verify-email');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'verified' });

      const res = await promise;
      expect(res.message).toBe('verified');
    });

    it('should call resendConfirmationCode endpoint', async () => {
      const service = TestBed.inject(AuthService);
      const promise = firstValueFrom(service.resendConfirmationCode('john@email.com'));

      const req = httpMock.expectOne('http://localhost:3000/api/resend-code');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });

      const res = await promise;
      expect(res).toBeDefined();
    });
  });

  describe('Google login', () => {
    it('should log in with Google and handle pending invitation tokens', async () => {
      sessionStorage.setItem('pending_invitation_token', 'invite-token');
      const response = { access_token: 'google-session-token' };

      const service = TestBed.inject(AuthService);
      const promise = firstValueFrom(service.loginWithGoogle('google-id-token'));

      const req = httpMock.expectOne('http://localhost:3000/api/auth/google');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        token: 'google-id-token',
        accessToken: undefined,
        invitationToken: 'invite-token'
      });
      req.flush(response);

      const res = await promise;
      expect(res).toEqual(response);
      expect(service.isLoggedIn()).toBe(true);
      expect(sessionStorage.getItem('pending_invitation_token')).toBeNull();
    });
  });

  describe('workspaces & permissions', () => {
    it('should get my workspaces', async () => {
      const service = TestBed.inject(AuthService);
      const workspaces = [{ id: 'tenant-1', name: 'Tenant A' }];
      const promise = firstValueFrom(service.getMyWorkspaces());

      const req = httpMock.expectOne('http://localhost:3000/api/auth/my-workspaces');
      expect(req.request.method).toBe('GET');
      req.flush(workspaces);

      const res = await promise;
      expect(res).toEqual(workspaces);
    });

    it('should switch tenant', () => {
      const service = TestBed.inject(AuthService);
      service.switchTenant('tenant-new');
      expect(localStorage.getItem('active_tenant_id')).toBe('tenant-new');
      expect(service.activeTenantId()).toBe('tenant-new');
    });

    it('should check permissions and roles', () => {
      localStorage.setItem('auth_token', 'token');
      const service = TestBed.inject(AuthService);

      expect(service.hasRole('administrador')).toBe(true);
      expect(service.hasPermission('VIEW_DASHBOARD')).toBe(true);
      expect(service.hasPermission('NON_EXISTENT')).toBe(false);
    });

    it('should return user data helper object', () => {
      localStorage.setItem('auth_token', 'token');
      const service = TestBed.inject(AuthService);

      const data = service.getUserData();
      expect(data).toEqual({
        id: 'user-123',
        email: 'john@email.com',
        name: 'John Doe',
        username: undefined,
        role: 'administrador',
        profilePictureUrl: undefined
      });
    });
  });
});
