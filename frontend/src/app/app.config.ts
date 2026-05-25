// Caminho: src/app/app.config.ts
// (Adicionado withDebugTracing)

import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
// Habilita rastreamento de rotas 'withDebugTracing'
import { provideRouter, withDebugTracing } from '@angular/router';

import { routes } from './app.routes';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptor/auth-interceptor';
import { GoogleLoginProvider, SocialAuthServiceConfig } from '@abacritt/angularx-social-login';
import { environment } from './environments/environment'; // Ajuste o caminho '../' conforme a pasta do seu projeto
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Habilita o rastreamento de rotas
    provideRouter(routes, withDebugTracing()),
    provideEnvironmentNgxMask(),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch()
    ),
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false, // Define se tenta logar automaticamente ao abrir a página
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.googleClientId, {
              // Força o Google a perguntar qual conta usar, ótimo para desenvolvimento/testes
              prompt: 'select_account',
              // Solicita acesso à API de contatos (Leitura e Escrita)
              scopes: 'https://www.googleapis.com/auth/contacts'
            })
          }
        ],
        onError: (err) => {
          console.error('Erro no Google Social Login:', err);
        }
      } as SocialAuthServiceConfig,
    }
  ]
};