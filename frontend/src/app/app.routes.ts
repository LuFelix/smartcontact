import { Routes } from '@angular/router';
import { LoginPage } from './features/auth/login/login-page/login-page';
import { LandingPage } from './pages/landing-page/landing-page';
import { authGuard } from './core/guards/auth-guard'; // Seu guarda de autenticação
import { roleGuard } from './core/guards/role-guard'; // Seu guarda de role (vamos substituir/complementar)
import { PermissionGuard } from './core/guards/permission.guard'; // Importe o guarda de permissão quando criado

// Importa o novo Layout e a página de Métricas
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { DashboardMetricsComponent } from './features/users/pages/dashboard-metrics/dashboard-metrics.component';
import { UnauthorizedComponent } from './core/pages/unauthorized-page/unauthorized.component'; // Importa a nova página
//import { Welcome } from './pages/welcome/welcome'; // Assumindo que exista

export const routes: Routes = [
    // Rotas Públicas
    { path: 'login', component: LoginPage, title: 'SmartContact - Login' },
    { path: '', component: LandingPage, pathMatch: 'full' }, // Rota raiz pública (Corrigido pathMatch)
    // Rota para Acesso Negado
    { path: 'unauthorized', component: UnauthorizedComponent },
    
    // Rota para Perfil Público (Mini-site via Tag)
    {
        path: 't/:uuid',
        loadComponent: () => 
        import('./features/users/pages/public-profile/public-profile.component')
            .then(m => m.PublicProfileComponent),
        title: 'SmartContact - Perfil Inteligente'
    },
    {
        path: 'register',
        title: 'SmartContact - Criar Conta', // Título que aparece na aba do navegador
        loadComponent: () => 
        import('./features/auth/register/register-page/register-page.component')
            .then(m => m.RegisterPageComponent)
    },
    // Rotas Protegidas
    {
        path: 'app', // Prefixo para rotas autenticadas (ou pode ser '')
        component: MainLayoutComponent,
        canActivate: [authGuard], // 1º Protege todo o layout com autenticação
        children: [
            // Rota Padrão após login (pode ser welcome ou dashboard)
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Redireciona /app para /app/dashboard
            // { path: 'welcome', component: Welcome }, // Se tiver uma página de boas-vindas

            // Rota REAL do Dashboard (com métricas)
            {
                path: 'dashboard',
                component: DashboardMetricsComponent,
                canActivate: [PermissionGuard], // Proteger com permissão VIEW_DASHBOARD
                data: { permissions: ['VIEW_DASHBOARD'] }
            },

            // Rotas dos Módulos/Páginas (Lazy Loaded)
            {   // Rota para Usuários (Gerencial)
                path: 'users',
                loadChildren: () => import('./features/users/pages/users-page/users.routes').then(m => m.USERS_ROUTES),
                canActivate: [PermissionGuard], // Usar guarda de permissão aqui
                data: { permissions: ['READ_USERS'] }
            },
            {   // Rota para Perfil do Usuário
                path: 'profile',
                loadChildren: () => import('./features/users/pages/profile-page/profile.routes').then(m => m.PROFILE_ROUTES),
                // Geralmente não precisa de guarda específico aqui, só o authGuard do pai
            },
            {
                path: 'roles',
                loadComponent: () => import('./features/admin/pages/roles-page/roles-page').then(m => m.RolesPageComponent),
                canActivate: [roleGuard],
                data: { roles: ['administrador'] },
                title: 'SmartContact - Gestão de Roles'
            },
            {
                path: 'leads',
                loadComponent: () => import('./features/users/pages/leads-page/leads-page').then(m => m.LeadsPage),
                canActivate: [authGuard],
                title: 'SmartContact - Meus Leads'
            },
            
            //outras rotas filhas aqui
        ]
    },

    // Rota Curinga (opcional, redireciona para login ou landing page)
    { path: '**', redirectTo: '' }
];
