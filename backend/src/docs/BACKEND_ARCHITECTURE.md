# 🏗️ Sumário Arquitetural do Backend - SmartContact

Este arquivo serve como documentação de referência para desenvolvedores e agentes de IA compreenderem o design, funcionamento, arquitetura e fluxos de dados do backend do **SmartContact** (NestJS + PostgreSQL + TypeORM).

> [!NOTE]
> Para detalhes técnicos adicionais sobre entidades do banco, contratos de API e segurança local, consulte os documentos dependentes:
> * 🗃️ **[Modelo de Dados e Esquema de Banco (TypeORM)](file:///home/jaspion/projetos/smartcontact/backend/src/docs/DATA_MODELS.md)**
> * 🔌 **[Mapeamento de Rotas e Contratos de DTOs](file:///home/jaspion/projetos/smartcontact/backend/src/docs/API_CONTRACTS.md)**
> * 🔐 **[Regras de Permissão e Políticas ABAC](file:///home/jaspion/projetos/smartcontact/backend/src/docs/ABAC_POLICIES.md)**

---

## 🏗️ 1. Estrutura de Pastas e Padrão de Design

O backend é construído sobre o ecossistema **NestJS** seguindo a modularização clássica (Domain-Driven Design simplificado):

```
/backend/src/
├── auth/                 # Autenticação, guards, decorators e Passport JWT Strategies
├── users/                # Módulo de cadastro global de usuários e DTOs
├── memberships/          # Gestão do pivot N:N e cargos locais do tenant
├── roles/                # Definição e CRUD de permissões e papéis locais
├── tags/                 # Estoque e lógica de redirecionamento dinâmico
├── team/                 # Gestão de convites e entrada de novos funcionários
├── interaction-logs/     # Auditoria física, rastreio e captura de Leads
├── analytics/            # KPIs e relatórios agregados de desempenho do time
├── tenants/              # Cadastro de Workspaces corporativos
├── profiles/             # Perfil público do cartão de visitas
└── docs/                 # Guias auxiliares de contexto técnico
```

---

## ⚙️ 2. Módulos e Responsabilidades Técnicas

### 🔹 Módulo de Autenticação (`Auth`)
* Responsável pela geração e decodificação do JWT e login com o Google (OAuth2).
* Implementa o **[JwtStrategy](file:///home/jaspion/projetos/smartcontact/backend/src/auth/strategies/jwt.strategy.ts)** que lê o header `X-Tenant-ID` e injeta a role dinâmica local do usuário para aquele workspace nas requisições.

### 🔹 Módulo de Usuários e Equipe (`Users`, `Team` e `Memberships`)
* **[UsersModule](file:///home/jaspion/projetos/smartcontact/backend/src/users/users.module.ts):** CRUD global de usuários e fluxos de promoção a vendedor ou rebaixamento a usuário standard.
* **[TeamModule](file:///home/jaspion/projetos/smartcontact/backend/src/team/team.module.ts):** Controle de convites coletivos e aceitação de novos membros via token.
* **[MembershipsModule](file:///home/jaspion/projetos/smartcontact/backend/src/memberships/memberships.module.ts):** Centraliza o pivot de segurança multi-tenant que liga o usuário ao seu workspace, perfil e cargo.

### 🔹 Módulo de Roteamento Dinâmico (`Tags` e `InteractionLogs`)
* **[TagsModule](file:///home/jaspion/projetos/smartcontact/backend/src/tags/tags.module.ts):** Resolve o roteamento de redirecionamento imediato quando o resolvedor público `/tags/resolve/:identifier` é acionado fisicamente por um visitante (via chip NFC ou QR Code).
* **[InteractionLogsModule](file:///home/jaspion/projetos/smartcontact/backend/src/interaction-logs/interaction-logs.module.ts):** Auditoria em tempo de execução que extrai metadados do request (Browser, Device, IP) e grava o histórico, servindo também como motor de captação de leads.

---

## 📖 3. Documentos Complementares de Contexto

Para evitar que este arquivo se torne excessivamente extenso, as especificações técnicas de baixo nível foram modularizadas nos seguintes guias:
* 🗃️ **[Modelo de Dados e Esquema de Banco (TypeORM)](file:///home/jaspion/projetos/smartcontact/backend/src/docs/DATA_MODELS.md)**: Mapeamento detalhado das tabelas do banco PostgreSQL, relacionamentos e diagramas de entidades.
* 🔌 **[Mapeamento de Rotas e Contratos de DTOs](file:///home/jaspion/projetos/smartcontact/backend/src/docs/API_CONTRACTS.md)**: Índice completo das APIs REST de backend, payloads aceitos e validações com DTOs.
* 🔐 **[Regras de Permissão e Políticas ABAC](file:///home/jaspion/projetos/smartcontact/backend/src/docs/ABAC_POLICIES.md)**: Explicações aprofundadas sobre o isolamento multi-tenant de banco, resolução dinâmica de privilégios locais e mecanismos de self-ownership bypass.
