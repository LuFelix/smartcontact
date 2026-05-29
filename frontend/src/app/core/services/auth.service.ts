// Caminho: src/app/core/services/auth.service.ts
// v3.3 - Completo: Signals + Permissões (Mock) + Register + Correções Tap/Login Timing + Logs

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
  private readonly socialAuthService = inject(SocialAuthService);

  // --- Signals para Estado ---
  readonly #decodedToken: WritableSignal<JwtPayload | null> = signal(null);
  readonly #userPermissions: WritableSignal<Set<string>> = signal(new Set());

  constructor() {
    console.log("[AuthService Constructor] Iniciando...");
    this.loadTokenFromStorage();
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

  // --- Métodos de Autenticação ---

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    console.log("[AuthService Login] Iniciando login...");
    let loginResponse: LoginResponse; // Variável para guardar a resposta original

    return this.http.post<LoginResponse>(`${this.BASE_PATH}/login`, credentials).pipe(
      tap({
          next: response => {
              console.log("[AuthService Login] Token recebido.");
              loginResponse = response; // Salva a resposta
              this.setSession(response.access_token); // Define #decodedToken
              console.log("[AuthService Login] Sessão definida (isLoggedIn agora é true).");
          },
          error: err => console.error("[AuthService Login] Erro na chamada HTTP:", err)
      }),
      // Garante que fetchAndStorePermissions rode APÓS o tap
      switchMap(() => {
          console.log("[AuthService Login] Chamando fetchAndStorePermissions...");
          return this.fetchAndStorePermissions(); // Retorna Observable<string[]>
      }),
      // Garante que o map rode APÓS fetchAndStorePermissions completar
      map((permissionsArray) => { // Recebe o array de permissões (embora não usemos diretamente aqui)
          console.log("[AuthService Login] fetchAndStorePermissions completou. Permissões devem estar no signal.");
          // Teste crucial: Verifica a permissão DEPOIS que fetchAndStorePermissions supostamente rodou
          const hasDashboardPerm = this.hasPermission('VIEW_DASHBOARD');
          console.log(`[AuthService Login] Teste hasPermission('VIEW_DASHBOARD') DENTRO do map final: ${hasDashboardPerm}`);
          console.log("[AuthService Login] Retornando loginResponse original:", loginResponse);
          // Retorna a resposta original do login para o componente
          return loginResponse;
      }),
      catchError(err => { // CatchError geral para o pipe de login
          console.error("[AuthService Login] Erro GERAL no pipe:", err);
          this.logout(); // Limpa tudo em caso de erro
          throw err; // Re-lança o erro para o componente tratar (mostrar msg, etc.)
      })
    );
  }

  logout(): void {
    console.log("[AuthService Logout] Deslogando...");

    localStorage.removeItem(this.TOKEN_KEY);
    this.#decodedToken.set(null);
    this.#userPermissions.set(new Set());

    this.socialAuthService.signOut()
      .then(() => console.log("Sessão do Google encerrada no frontend."))
      .catch((err: unknown) => console.log("Google SignOut ignorado (não estava logado)."));

    this.router.navigate(['/login']);
  }

  register(registrationData: RegistrationData): Observable<any> {
    const url = `${this.BASE_PATH}/register`;
    console.log(`[AuthService] register Chamando: ${url}`);
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
        console.log("[AuthService setSession] Token salvo. Role do usuário:", decoded.role);
        console.log("[AuthService setSession] Signal #decodedToken atualizado.");
    } catch (error) {
        console.error("[AuthService setSession] Erro ao decodificar ou salvar token:", error);
        this.logout();
    }
  }

  private loadTokenFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    console.log(`[AuthService loadToken] Token encontrado no localStorage: ${!!token}`);
    if (token) {
        try {
            // TODO: Adicionar verificação de expiração do token aqui
            // Ex: const decoded = jwtDecode<JwtPayload & { exp: number }>(token);
            //     if (decoded.exp * 1000 < Date.now()) throw new Error("Token expirado");
            const decoded = jwtDecode<JwtPayload>(token);
            this.#decodedToken.set(decoded);
            console.log("[AuthService loadToken] Token válido carregado para o signal #decodedToken.");
        } catch (error) {
            console.error("[AuthService loadToken] Token armazenado inválido ou expirado:", error);
            // Limpa o token inválido explicitamente antes de chamar logout (que também limpa)
            localStorage.removeItem(this.TOKEN_KEY);
            this.logout(); // Chama logout para limpar tudo e redirecionar
        }
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // --- Métodos de Permissão e Role ---

  hasRole(role: string): boolean {
    const userRole = this.userRole(); // Usa o computed signal
    const result = userRole?.toLowerCase() === role.toLowerCase();
    // console.log(`[AuthService hasRole] Verificando role "${role}". Usuário tem? ${result}. Role atual: ${userRole}`);
    return result;
  }

  hasPermission(permission: string): boolean {
    const currentPermissions = this.#userPermissions(); // Pega o valor atual do signal (Set)
    const hasPerm = currentPermissions.has(permission);
    // Log detalhado para depuração
    //console.log(`[AuthService hasPermission] Verificando permissão "${permission}". O Set contém? ${hasPerm}. Signal atual (#userPermissions):`, Array.from(currentPermissions));
    return hasPerm;
  }

  /**
   * MOCKADO: Busca e armazena as permissões no signal #userPermissions.
   */
  fetchAndStorePermissions(): Observable<string[]> {
    // A verificação isLoggedIn() é feita antes de chamar este método (no login e startup)
    // Mas adicionamos uma aqui por segurança extra.
    if (!this.isLoggedIn()) {
        console.warn("[AuthService FetchPerms] Tentativa de buscar permissões sem estar logado. Retornando vazio.");
        this.#userPermissions.set(new Set()); // Garante limpeza
        return of([]);
    }

    console.warn("--- [AuthService FetchPerms] MODO MOCK ATIVADO ---");
    const mockPermissions: string[] = [
        "READ_USERS", "INVITE_USER", "CREATE_USER", "EDIT_USER_PROFILE",
        "ASSIGN_USER_ROLES", "DELETE_USER", "EXPORT_USERS",
        "READ_CERTIFICATIONS", "MANAGE_CERTIFICATIONS", "VIEW_DASHBOARD", // <--- PERMISSÃO DO DASHBOARD
        "TAKE_CERTIFICATIONS", "SIMULATE_EXAM" // Adicionadas para teste
        // Confirme se VIEW_DASHBOARD está exatamente assim!
    ];

    return of(mockPermissions).pipe(
        tap({
            next: permissions => {
                console.log("[AuthService FetchPerms] Permissões MOCKADAS recebidas:", permissions);
                this.#userPermissions.set(new Set(permissions)); // <-- ATUALIZA O SIGNAL AQUI
                console.log("[AuthService FetchPerms] Signal #userPermissions ATUALIZADO.");
            }
        })
    );

    /* --- CÓDIGO REAL (COMENTADO) ---
    console.log("[AuthService FetchPerms] Buscando permissões REAIS de:", this.permissionsUrl);
    return this.http.get<string[]>(this.permissionsUrl).pipe(
      tap({
          next: permissions => {
            console.log("[AuthService FetchPerms] Permissões REAIS recebidas:", permissions);
            this.#userPermissions.set(new Set(permissions));
            console.log("[AuthService FetchPerms] Signal #userPermissions ATUALIZADO com dados reais.");
          }
      }),
      catchError(error => {
        console.error('[AuthService FetchPerms] Erro ao buscar permissões REAIS:', error);
        this.#userPermissions.set(new Set()); // Limpa em caso de erro
        // this.logout(); // Considerar deslogar?
        return of([]);
      })
    );
    */
  }

  /**
   * Carrega permissões se logado ao iniciar o app. Chamado pelo construtor.
   */
  private loadUserPermissionsOnStartup(): void {
      console.log("[AuthService Startup] Chamando fetchAndStorePermissions no startup...");
      this.fetchAndStorePermissions().pipe(
          catchError(err => {
              console.error("[AuthService Startup] Erro silencioso ao buscar permissões no startup:", err);
              return of([]); // Não quebra a inicialização
          })
      ).subscribe(() => { // Não precisamos fazer nada com o resultado aqui
           console.log("[AuthService Startup] Subscrição de permissões no startup concluída (mock ou real).");
      });
  }

   // Obtém dados básicos (usando o signal)
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
   /**
 * Solicita ao NestJS o reenvio do código de confirmação via SMTP (HostGator)
 * @param email O e-mail do usuário que precisa do novo código
 */
  resendConfirmationCode(email: string): Observable<any> {
    // Ajuste o endpoint conforme a rota que criamos no NestJS (ex: /auth/resend-code)
    return this.http.post(`${this.API_URL}/resend-code`, { email });
  }

  // --- No seu AuthService (auth.service.ts) ---

  loginWithGoogle(idToken: string, accessToken?: string): Observable<LoginResponse> {
    console.log("[AuthService Google Login] Iniciando validação do token Google...");
    let loginResponse: LoginResponse;

    const invitationToken = sessionStorage.getItem('pending_invitation_token');

    const payload = { 
        token: idToken,
        accessToken: accessToken,
        invitationToken: invitationToken || undefined
    };

    // 1. Enviamos os tokens para o endpoint do NestJS
    return this.http.post<LoginResponse>(`${this.BASE_PATH}/google`, payload).pipe(
      tap({
        next: response => {
          console.log("[AuthService Google Login] Token do sistema recebido após validação Google.");
          loginResponse = response;
          this.setSession(response.access_token); // Salva o JWT do nosso sistema e atualiza signals
          if (invitationToken) {
              sessionStorage.removeItem('pending_invitation_token');
          }
        },
        error: err => console.error("[AuthService Google Login] Erro na validação backend:", err)
      }),
      // 2. Repetimos o fluxo de permissões para garantir que o usuário logado via Google tenha acesso ao Dashboard
      switchMap(() => {
        console.log("[AuthService Google Login] Buscando permissões para usuário social...");
        return this.fetchAndStorePermissions();
      }),
      map(() => {
        console.log("[AuthService Google Login] Fluxo completo. Redirecionando...");
        return loginResponse;
      }),
      catchError(err => {
        console.error("[AuthService Google Login] Erro Crítico no fluxo Social:", err);
        this.logout();
        throw err;
      })
    );
  }
   
}