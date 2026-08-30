// Caminho: src/app/core/services/auth.service.ts
// v3.4 - Context Switcher: Suporte a Multi-Tenant e Signals de Workspace

import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Observable, of } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import {
    RegistrationData,
    JwtPayload,
    UserData
} from '../../features/shared/models/users.models';
import { environment } from '../../environments/environment';
import { LoginCredentials, LoginResponse } from '../../features/shared/models/auth.model';
import { SocialAuthService } from '@abacritt/angularx-social-login';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL = environment.apiUrl;
  private readonly BASE_PATH = `${this.API_URL}/auth`;
  private permissionsUrl = `${this.API_URL}/users/me/permissions`; 
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly TOKEN_KEY = 'auth_token';
  private readonly TENANT_KEY = 'active_tenant_id';
  private readonly socialAuthService = inject(SocialAuthService);

  // --- Signals para Estado ---
  readonly #decodedToken: WritableSignal<JwtPayload | null> = signal(null);
  readonly #userPermissions: WritableSignal<Set<string>> = signal(new Set());
  readonly #activeTenantId: WritableSignal<string | null> = signal(null);
  readonly workspaces: WritableSignal<any[]> = signal([]);

  constructor() {
    console.log("[AuthService Constructor] Iniciando...");
    this.loadTokenFromStorage();
    this.loadActiveTenantFromStorage();
    if (this.isLoggedIn()) {
        console.log("[AuthService Constructor] Usuário logado no início. Chamando loadUserPermissionsOnStartup...");
        this.loadUserPermissionsOnStartup(); // Carrega permissões se já houver token
    } else {
        console.log("[AuthService Constructor] Usuário NÃO logado no início.");
    }
  }

  // --- Computed Signals Públicos ---
  readonly isLoggedIn = computed(() => !!this.#decodedToken());
  readonly userRole = computed(() => this.#decodedToken()?.role);
  readonly userEmail = computed(() => this.#decodedToken()?.email);
  readonly userName = computed(() => this.#decodedToken()?.name);
  readonly userId = computed(() => this.#decodedToken()?.sub);
  readonly userUsername = computed(() => this.#decodedToken()?.username);
  readonly userPicture = computed(() => this.#decodedToken()?.picture);
  readonly activeTenantId = computed(() => this.#activeTenantId());

  readonly activeRole = computed(() => {
    const activeId = this.#activeTenantId();
    const wss = this.workspaces();
    if (!activeId || wss.length === 0) return this.userRole();
    const current = wss.find(w => w.tenantId === activeId);
    return current?.role?.name || this.userRole();
  });

  // --- Métodos de Autenticação ---

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    console.log("[AuthService Login] Iniciando login...");
    let loginResponse: LoginResponse;

    return this.http.post<LoginResponse>(`${this.BASE_PATH}/login`, credentials).pipe(
      tap({
          next: response => {
              console.log("[AuthService Login] Token recebido.");
              loginResponse = response;
              this.setSession(response.access_token);
              console.log("[AuthService Login] Sessão definida.");
          },
          error: err => console.error("[AuthService Login] Erro na chamada HTTP:", err)
      }),
      switchMap(() => {
          return this.fetchAndStorePermissions();
      }),
      map(() => {
          return loginResponse;
      }),
      catchError(err => {
          console.error("[AuthService Login] Erro GERAL no pipe:", err);
          this.logout();
          throw err;
      })
    );
  }

  logout(): void {
    console.log("[AuthService Logout] Deslogando...");

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TENANT_KEY);
    this.#decodedToken.set(null);
    this.#userPermissions.set(new Set());
    this.#activeTenantId.set(null);

    this.socialAuthService.signOut()
      .then(() => console.log("Sessão do Google encerrada no frontend."))
      .catch((err: unknown) => console.log("Google SignOut ignorado."));

    this.router.navigate(['/login']);
  }

  register(registrationData: RegistrationData): Observable<any> {
    const url = `${this.BASE_PATH}/register`;
    return this.http.post(url, registrationData);
  }

  verifyEmailCode(payload: { email: string; code: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.BASE_PATH}/verify-email`, payload);
  }

  // --- Métodos de Token e Sessão ---

  private setSession(token: string): void {
    try {
        localStorage.setItem(this.TOKEN_KEY, token);
        const decoded = jwtDecode<JwtPayload>(token);
        this.#decodedToken.set(decoded);
        
        // Define o tenant inicial se nenhum estiver selecionado
        if (!this.#activeTenantId() && decoded.tenantId) {
            this.switchTenant(decoded.tenantId);
        }

        console.log("[AuthService setSession] Token salvo.");
    } catch (error) {
        console.error("[AuthService setSession] Erro ao decodificar ou salvar token:", error);
        this.logout();
    }
  }

  private loadTokenFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            this.#decodedToken.set(decoded);
        } catch (error) {
            localStorage.removeItem(this.TOKEN_KEY);
            this.logout();
        }
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // --- Métodos de Workspace (Multi-Tenant) ---

  getMyWorkspaces(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_PATH}/my-workspaces`).pipe(
      tap(data => this.workspaces.set(data))
    );
  }

  switchTenant(tenantId: string): void {
    console.log(`[AuthService] Chaveando para o Workspace: ${tenantId}`);
    localStorage.setItem(this.TENANT_KEY, tenantId);
    this.#activeTenantId.set(tenantId);
    
    // Força um reload parcial ou notifica os componentes que o contexto mudou
    // No Angular, o Interceptor pegará o novo valor do signal automaticamente
    // Se quisermos recarregar as permissões específicas do novo tenant, faríamos aqui.
  }

  private loadActiveTenantFromStorage(): void {
    const tenantId = localStorage.getItem(this.TENANT_KEY);
    if (tenantId) {
        this.#activeTenantId.set(tenantId);
    }
  }

  // --- Métodos de Permissão e Role ---

  hasRole(role: string): boolean {
    const roleName = this.activeRole();
    return roleName?.toLowerCase() === role.toLowerCase();
  }

  hasPermission(permission: string): boolean {
    return this.#userPermissions().has(permission);
  }

  fetchAndStorePermissions(): Observable<string[]> {
    if (!this.isLoggedIn()) {
        this.#userPermissions.set(new Set());
        return of([]);
    }

    // Por enquanto mantemos o MOCK, mas no futuro isso virá do backend filtrado pelo tenantId ativo
    const mockPermissions: string[] = [
        "READ_USERS", "INVITE_USER", "CREATE_USER", "EDIT_USER_PROFILE",
        "ASSIGN_USER_ROLES", "DELETE_USER", "EXPORT_USERS",
        "READ_CERTIFICATIONS", "MANAGE_CERTIFICATIONS", "VIEW_DASHBOARD",
        "TAKE_CERTIFICATIONS", "SIMULATE_EXAM"
    ];

    return of(mockPermissions).pipe(
        tap(permissions => {
            this.#userPermissions.set(new Set(permissions));
        })
    );
  }

  private loadUserPermissionsOnStartup(): void {
      this.fetchAndStorePermissions().pipe(
          catchError(() => of([]))
      ).subscribe();
  }

   getUserData(): UserData | null {
       const decoded = this.#decodedToken();
       if (!decoded) return null;
       return {
           id: decoded.sub,
           email: decoded.email,
           name: decoded.name, 
           username: decoded.username,
           role: decoded.role,
           profilePictureUrl: decoded.picture
       };
   }

  resendConfirmationCode(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/resend-code`, { email });
  }

  loginWithGoogle(idToken: string, accessToken?: string): Observable<LoginResponse> {
    let loginResponse: LoginResponse;
    const invitationToken = sessionStorage.getItem('pending_invitation_token');

    const payload = { 
        token: idToken,
        accessToken: accessToken,
        invitationToken: invitationToken || undefined
    };

    return this.http.post<LoginResponse>(`${this.BASE_PATH}/google`, payload).pipe(
      tap(response => {
          loginResponse = response;
          this.setSession(response.access_token);
          if (invitationToken) sessionStorage.removeItem('pending_invitation_token');
      }),
      switchMap(() => this.fetchAndStorePermissions()),
      map(() => loginResponse),
      catchError(err => {
        this.logout();
        throw err;
      })
    );
  }
}