// run-seed.ts
/**
 * ============================================================================
 * SCRIPT DE SEED - POPULAÇÃO INICIAL DO BANCO DE DADOS
 * ============================================================================
 *
 * Este script executa o seeding da aplicação, criando:
 * - 3 Roles (colaborador, administrador, usuario)
 * - 1 Usuário Administrador padrão
 *
 * Como executar:
 *   - Local: npm run seed
 *   - Docker: docker compose exec api npm run seed
 *
 * ============================================================================
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './seeds/seed.service';

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Funções de log com cores
const log = {
  title: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`),
  section: (msg: string) => console.log(`${colors.bright}${colors.blue}▶ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  detail: (msg: string) => console.log(`${colors.dim}  → ${msg}${colors.reset}`),
  stats: (msg: string) => console.log(`${colors.bright}${colors.magenta}${msg}${colors.reset}`),
};

async function bootstrap() {
  log.title('');
  console.log(`${colors.bright}${colors.cyan}  🌱 SCRIPT DE SEED - POPULAÇÃO INICIAL DO BANCO${colors.reset}`);
  log.title('');

  let app: any = null;
  const startTime = Date.now();

  try {
    log.section('Etapa 1: Inicializando aplicação NestJS');
    log.detail('Carregando módulos...');

    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'], // Apenas erros
    });

    log.success('Aplicação NestJS inicializada com sucesso');

    log.section('Etapa 2: Verificando conexão com banco de dados');
    log.detail('Testando conexão...');

    // O DataSource agora é configurado automaticamente via TypeORM em AppModule
    log.success('Conexão com banco de dados estabelecida');

    log.section('Etapa 3: Executando processo de seeding');
    log.detail('Criando roles padrão...');
    log.detail('Criando usuário administrador...');

    const seeder = app.get(SeedService);
    await seeder.run();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log.title('');
    log.stats(`✅ SEEDING CONCLUÍDO COM SUCESSO!`);
    log.title('');

    console.log(`${colors.cyan}Usuário Admin Padrão:${colors.reset}`);
    console.log(`  • Email: admin@smartcontact.com.br`);
    console.log(`  • Senha: Senha@123`);

    log.title('');
    console.log(
      `\n${colors.bright}${colors.green}Para entrar no dashboard, use as credenciais acima.${colors.reset}\n`
    );

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log.title('');
    log.error('ERRO DURANTE O SEEDING!');
    log.title('');

    console.log(`${colors.red}${colors.bright}Detalhes do erro:${colors.reset}`);
    if (error instanceof Error) {
      console.log(`${colors.red}Nome: ${error.name}${colors.reset}`);
      console.log(`${colors.red}Mensagem: ${error.message}${colors.reset}`);
    } else {
      console.log(`${colors.red}${JSON.stringify(error, null, 2)}${colors.reset}`);
    }

    console.log(
      `\n${colors.yellow}Tempo até o erro: ${duration}s${colors.reset}\n`
    );

    process.exit(1);

  } finally {
    if (app) {
      log.section('Fechando aplicação...');
      await app.close();
      log.success('Aplicação encerrada');
    }
  }
}

// Executar bootstrap
bootstrap().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
