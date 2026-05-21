# 📱 SmartContact — Seu Networking Inteligente

> **Documento Estratégico:** Prova de Conceito (POC)  
> **Equipe:** Luciano, Kelvin e Josenilton

---

## 📑 1. Resumo Executivo
O objetivo desta Prova de Conceito (POC) é demonstrar a utilização de tags NFC como um mecanismo inteligente e sem fricção de networking digital. Substituímos o cartão de visita tradicional por uma plataforma conectada, dinâmica e rastreável, facilitando a troca de contatos e a geração de valor em interações profissionais.

## 🛑 2. Definição do Problema
O compartilhamento tradicional de contatos profissionais ainda depende de métodos com alto nível de fricção:
* Digitação manual de dados que geram erros;
* Troca de papéis físicos (cartões) que são frequentemente perdidos ou desatualizados;
* Ausência total de métricas de engajamento após a interação inicial.

O **SmartContact** elimina essas barreiras, aproximando o mundo físico do digital com um simples toque.

## 🏗️ 3. Arquitetura da Solução
A solução é estruturada em três pilares principais:

* **📡 Módulo de Escrita e Leitura NFC:** A interface física da solução. Tags NFC são programadas com URLs dinâmicas seguras que apontam diretamente para a nossa plataforma.
* **🔀 Camada de Redirecionamento Inteligente:** O "cérebro" do sistema. Ao ler a tag, a requisição é interceptada pelo backend, que avalia as configurações em tempo real para decidir o destino (Perfil digital, WhatsApp direto, vCard para agenda, LinkedIn, Landing Pages, etc).
* **📊 Painel de Gestão (Dashboard):** Área logada onde os proprietários das tags gerenciam seus links, visualizam os relatórios de analytics de interação e configuram o comportamento das suas tags dinamicamente.

### Estratégia Multi-Tenant e Base Modular
A solução será construída sobre uma **arquitetura modular e reutilizável**. A aplicação está estruturada desde a POC com **suporte multi-tenant**, garantindo que o ecossistema esteja preparado para escalar e atender diferentes perfis de negócios e empresas de forma isolada, segura e performática.

## 🛠️ 4. Stack Tecnológico

* **Frontend:** Angular 17+, PWA (Progressive Web App)
* **Backend:** NestJS, RESTful API, Autenticação JWT, RBAC, Swagger
* **Banco de Dados & Infraestrutura:** PostgreSQL, Docker, Docker Compose
* **Hardware Suportado:** Tags NFC, Smartphones iOS e Android

## ✨ 5. Funcionalidades e Analytics

* **🤝 Compartilhamento Inteligente:** Perfil digital responsivo com foto, links sociais e botão de download automático para agenda (vCard).
* **🔀 Redirecionamento Dinâmico:** Capacidade de trocar o destino da tag (Ex: de "Perfil Web" para "WhatsApp Direto") instantaneamente pelo sistema, sem necessidade de regravar o chip físico.
* **📈 Analytics de Interação:** O sistema captura e processa logs valiosos (Leituras por horário, tipo de dispositivo e navegador, geolocalização por IP e taxa de cliques em ações específicas).
* **🔔 Aviso de Leitura (Push Notification):** Notificação nativa no celular (PWA/Firebase) no momento exato em que a tag é lida, processada de forma assíncrona (Event-Driven) para garantir performance.

## 🎯 6. Critérios de Sucesso e Roadmap

### Critérios de Êxito da POC
- **Leitura NFC:** 100% de sucesso no reconhecimento das tags por dispositivos compatíveis.
- **Acurácia de Dados:** Coleta e gravação fiel dos dados de interação no módulo de Analytics.
- **Performance:** Redirecionamento e entrega do destino abaixo de 500ms.
- **Compatibilidade & Escalabilidade:** Funcionamento consistente cross-browser (Mobile) e infraestrutura rodando orquestrada pelo Docker de forma estável.

### 🚀 Roadmap Evolutivo
- **Fase 1 (Atual - POC):** Aplicação web funcional, dashboard de gerenciamento, banco populado via seeder, tags NFC configuradas e analytics básico ativo.
- **Fase 2:** Integração com CRMs (Salesforce, HubSpot) e captação/exportação estruturada de leads diretos (vCards reversos).
- **Fase 3:** Soluções corporativas avançadas, aplicativo móvel nativo (se necessário para escrita em lote) e BI avançado.

## 📦 7. Produto Final Esperado
Ao término da POC, entregaremos o repositório completo com uma aplicação web robusta, banco de dados isolado com dados pré-populados (seed), documentação de APIs mapeada via Swagger e a inteligência de negócios provada fisicamente pelas tags NFC operantes.

---

## 🗺️ 8. Plano de Metas e Checklist de Execução (POC)

Abaixo está o mapa de execução passo a passo, desde a fundação até o Go-Live da POC.

### Etapa 0: Fundação e Orquestração (Base MVP) 🏁
- [x] **Setup do Repositório Base:** Clonagem e estruturação do downstream (MVP-Base).
- [x] **Orquestração Docker:** Configuração do `docker-compose.yml` (Postgres, NestJS, Angular).
- [x] **Autenticação & Landing Page:** Login com Google, JWT e página de entrada estruturados.
- [x] **Módulo de Usuários e RBAC:** Controle de acesso base (Admin, Colaborador, etc.).
- [x] **Automação de Banco:** Scripts de Seed automatizados e banco de dados populado.

### Etapa 1: Modelagem de Dados Core (Backend) ⏳
- [ ] **Issue 1.1:** Criar módulo e entidade `Profile` (Bio, Tema, Links) atrelada ao `User` e preparada com `tenant_id` (Isolamento Multi-Tenant).
- [ ] **Issue 1.2:** Criar módulo e entidade `Tag` (UUID, Modo de Redirecionamento) atrelada ao `User` e preparada com `tenant_id`.
- [ ] **Issue 1.3:** Criar módulo e entidade `InteractionLog` para ingestão de dados de Analytics.

### Etapa 2: Motor de Redirecionamento Inteligente (Backend) 🧠
- [ ] **Issue 2.1:** Criar endpoint público `/api/tags/resolve/:uuid` retornando os dados em JSON, protegido com **Rate Limiting** por IP.
- [ ] **Issue 2.2:** Adicionar lógica de roteamento dinâmico (WhatsApp, URL Customizada, Perfil) no endpoint.
- [ ] **Issue 2.3:** Criar utilitário e endpoint auxiliar para geração on-the-fly do arquivo `.vcf` (vCard).
- [ ] **Issue 2.4:** Configurar `@nestjs/event-emitter` e integração com Firebase Admin (FCM) para disparo assíncrono de Push Notifications baseado no `tenant_id`/`user_id`.

### Etapa 3: Cartão Digital Público (Frontend) 📱
- [ ] **Issue 3.1:** Configurar feature `public-profile` no Angular com rota pública `/t/:uuid` (sem AuthGuard).
- [ ] **Issue 3.2:** Desenvolver layout Mobile-First base (Header, Avatar, Nome e Bio).
- [ ] **Issue 3.3:** Implementar Grid de botões sociais (WhatsApp, LinkedIn, Instagram).
- [ ] **Issue 3.4:** Implementar integração do botão "Salvar Contato" consumindo o endpoint de vCard.

### Etapa 4: Painel Administrativo e Analytics (Fullstack) 📊
- [ ] **Issue 4.1:** Frontend - Criar formulário de Edição do Perfil Digital na área logada.
- [ ] **Issue 4.2:** Frontend - Criar tela de gestão de Tags (Listagem e alteração do Modo de Redirecionamento).
- [ ] **Issue 4.3:** Backend - Gravação assíncrona no `InteractionLog` ao acessar a tag, incluindo a extração/parsing de **IP e User-Agent** (Dispositivo/Navegador).
- [ ] **Issue 4.4:** Frontend - Criar UI do Dashboard mostrando total de leituras, dispositivos e links mais clicados.
- [ ] **Issue 4.5:** Implementar "Modo Evento" no Angular (Service Worker + Firebase Messaging) para solicitar permissão do usuário e registrar o Device Token no backend.

### Etapa 5: Validação e Testes Físicos (Go-Live) 🚀
- [ ] **Issue 5.1 (Infra):** Configurar Ngrok ou túnel temporário para expor o localhost para a internet (essencial para ler no celular real).
- [ ] **Issue 5.2 (Hardware):** Gravar UUIDs nas Tags NFC físicas.
- [ ] **Issue 5.3 (QA):** Realizar teste End-to-End (Celular > Leitura Física > Roteamento > Analytics).
- [ ] **Issue 5.4:** Aprovação de Performance (< 500ms na leitura) e finalização da POC.

---

## 🚀 9. Guia de Setup e Deploy (Docker)

Este projeto utiliza uma arquitetura isolada para garantir que múltiplos sistemas possam rodar na mesma VPS sem conflitos.

### 🔑 9.1. Configuração do Arquivo `.env` (CRÍTICO)

O arquivo `.env` deve ser criado na raíz do projeto. **Atenção à sintaxe:** não utilize espaços ao redor do `=` e certifique-se de que todas as chaves estão corretas.

**Dados Sensíveis:** Solicite diretamente ao Luciano/Coordenação os valores de `JWT_SECRET`, `GEMINI_API_KEY`, `SUI_ADMIN_PRIVATE_KEY` e credenciais de e-mail.

#### Exemplo de Estrutura Necessária:
```bash
# Database (Conexão da API)
DB_TYPE=postgres
DB_HOST=db  # Nome do serviço no docker-compose
DB_PORT=5432
DB_USERNAME=smartcontact_admin
DB_PASSWORD=SUA_SENHA_AQUI
DB_DATABASE=smartcontact_db

# PostgreSQL (Inicialização do Container)
POSTGRES_DB=smartcontact_db
POSTGRES_USER=smartcontact_admin
POSTGRES_PASSWORD=SUA_SENHA_AQUI
POSTGRES_PORT=5432

# Backend & JWT
BACKEND_PORT=3001
NODE_ENV=production
JWT_SECRET=SOLICITAR_AO_GESTOR
JWT_EXPIRES_IN=1d

# URLs (Importante para o Login)
API_URL=https://smartcontact.tiweb.app.br/api
```

### 🐳 9.2. Rodando em Produção (VPS)

Em produção, usamos apenas o arquivo `.prod.yml` para evitar mapeamentos de volume que quebram o código compilado.

```bash
# 1. Reset Total (Limpa volumes antigos/errados)
docker compose -f docker-compose.prod.yml down -v

# 2. Build e Start
docker compose -f docker-compose.prod.yml up -d --build

# 3. Executar o Seed (Obrigatório na primeira vez)
# Nota: Em produção, usamos o comando que aponta para a pasta /dist
docker compose exec api node dist/run-seed.js
```

**Porta de Acesso:** O sistema estará disponível em `https://smartcontact.tiweb.app.br` (via porta 8081 mapeada no host).

### 💻 9.3. Rodando em Desenvolvimento (Local)

Para desenvolvimento com Live Reload:

```bash
docker compose up -d --build
docker compose exec api npm run seed
```

---

## 🛠️ 10. Notas Técnicas Importantes

*   **Prefixo de API:** Todas as rotas do backend estão sob o prefixo `/api`. O Nginx está configurado para rotear automaticamente.
*   **Isolamento:** O projeto foi configurado com nomes de volumes exclusivos (`smartcontact_prod_pgdata`) para não colidir com o projeto `mas-ia` que roda na mesma máquina.
*   **Responsividade:** O layout é **Mobile-First**. Tabelas foram substituídas por **Cards** para garantir que o dashboard seja utilizável em qualquer celular.
*   **Login Padrão:** Após o seed, use `pedir usuário` / `pedir senha` para acessar a área logada  ao admin do repositório.

--- 
