# 📁 Sumário Técnico da Feature: Admin

Este arquivo serve como documentação de referência para desenvolvedores e agentes de IA compreenderem o design, funcionamento, arquitetura e fluxos de dados da feature **Admin** (Console de Gestão do Workspace) no frontend do **SmartContact**.

> [!NOTE]
> Para detalhes técnicos adicionais sobre contratos de dados, chamadas de rede e segurança, consulte os documentos dependentes:
> * 🗃️ **[Modelos de Dados e Interfaces (TypeScript)](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/docs/DATA_MODELS.md)**
> * 🔌 **[Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/docs/API_ENDPOINTS.md)**
> * 🔐 **[Regras de Permissão e Políticas ABAC](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/docs/ABAC_POLICIES.md)**

---

## 🏗️ 1. Arquitetura e Estrutura de Pastas

A feature está localizada em `/frontend/src/app/features/admin/` e gerencia as configurações locais do inquilino (Tenant) sob os padrões do Angular (versão standalone):

```
/frontend/src/app/features/admin/
├── components/           # Componentes de apresentação (Dumb Components & Dialogs)
│   ├── member-invitation-dialog/ # Modal para convidar membros via e-mail
│   ├── members-card-list/        # Grade de cards de membros da equipe
│   ├── members-list-view/        # Tabela clássica de membros da equipe
│   ├── promotion-dialog/         # Modal para promover contatos do tenant
│   ├── resource-delegation-dialog/ # Modal ampla para delegar tags a membros
│   ├── role-dialog/              # Modal para criar/editar funções (roles)
│   ├── roles-card-list/          # Grade de cards para exibir roles
│   ├── roles-list-view/          # Tabela de dados para exibir roles
│   ├── tag-card-list/            # Grade de cards para exibir tags do estoque
│   ├── tag-dialog/               # Modal ampla para cadastrar/editar tags
│   ├── tag-list-view/            # Tabela de dados de tags do estoque
│   └── user-details/             # Visualização expandida de dados do usuário
├── pages/                # Páginas inteligentes (Smart Components / Containers)
│   ├── roles-page/               # Console de Gestão de Funções (Roles)
│   ├── tag-manager/              # Console de Gestão do Estoque de Tags
│   └── team-manager/             # Console de Gestão de Membros de Equipe
├── services/             # Serviços Angular (comunicação com a API Rest)
│   └── roles.service.ts          # Gerência de CRUD de roles no tenant
└── docs/                 # Documentos de especificação técnica auxiliares
```

---

## ⚙️ 2. Serviços da Feature (`/services`)

*(Mapeamento completo das chamadas de rede e payloads detalhado em: [Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/docs/API_ENDPOINTS.md))*

### 🔹 [roles.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/services/roles.service.ts)
Gerencia as funções customizadas locais criadas dentro do workspace. 
* Provê métodos CRUD padrão (`findAll`, `findOne`, `create`, `update`, `delete`) apontando para `/roles` no backend.

### 🔹 Serviços de Core Consumidos
Para gerenciar o Tenant de forma completa, a feature Admin consome serviços localizados no Core do sistema:
* **[TeamService](file:///home/jaspion/projetos/smartcontact/frontend/src/app/core/services/team.service.ts):** Permite listar membros da equipe (`listMembers`), enviar convites (`addMember`), remover membros (`removeMember`) e criar tokens de link de convite (`createInvitation`).
* **[TagService](file:///home/jaspion/projetos/smartcontact/frontend/src/app/core/services/tag.service.ts):** Utilizado para listar todo o estoque de recursos do Workspace, vincular novos chips NFC e revogar delegações.

---

## 🖥️ 3. Fluxos de Negócio e Páginas (`/pages`)

### 1. Gestão de Equipe (`/team-manager`)
* **Componente:** `TeamManagerComponent`
* **Descrição:** Console central do administrador para controle de pessoal.
* **Mecanismos:**
  * Lista e filtra membros localmente por nome, e-mail e função.
  * **Isolamento de Contatos:** Filtra os dados de usuários recebidos para manter apenas quem possui perfil instanciado (`!!u.profile`), evitando misturar leads de contatos na tela de funcionários.
  * Abre diálogos amplos (usando a diretiva `large-abac-modal`) para convites de membros e delegação de tags físicas.

### 2. Gestão do Estoque de Recursos e Tags (`/tag-manager`)
* **Componente:** `TagManagerComponent`
* **Descrição:** Área onde o administrador gerencia e cadastra tags físicas (estoque do Workspace).
* **Mecanismos:**
  * Reage a trocas de Tenant no Context Switcher monitorando o signal `activeTenantId` para atualizar e carregar as tags corretas.
  * Integra-se ao `NfcWriterDialogComponent` para formatar e gravar fisicamente URLs direcionadoras estruturadas com a query `source=nfc` no chip de hardware.
  * Permite abrir a modal `TagDialogComponent` com dimensões ABAC (900px, sem foco automático) para cadastros e edições em lote de redirecionamento.

### 3. Gestão de Funções e Níveis de Acesso (`/roles-page`)
* **Componente:** `RolesPageComponent`
* **Descrição:** Painel para criar e alterar papéis customizados e suas permissões granulares locais.
* **Mecanismos:**
  * Executa requisições CRUD no `rolesService` e fornece modais para cadastramento de novos escopos de privilégios.

---

## 🎨 4. Componentes de Apresentação e Modais (`/components`)

A visualização e fluxos modais são estruturados através de componentes desacoplados:
* **Visualização Alternada (Grid vs List):** Os subcomponentes de listagem (Membros, Roles e Tags) são divididos em `CardList` e `ListView`, alternando visualmente com base no `LayoutService`.
* **Modais Específicas:**
  * **[ResourceDelegationDialogComponent](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/components/resource-delegation-dialog/resource-delegation-dialog.ts):** Interface de 900px para o administrador atribuir ou revogar privilégios de tags para colaboradores específicos.
  * **[MemberInvitationDialogComponent](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/components/member-invitation-dialog/member-invitation-dialog.ts):** Formulário de convite rápido via e-mail e criação de tokens compartilháveis.

---

## 📖 5. Documentos Complementares de Contexto

Para evitar que este arquivo se torne excessivamente extenso, as especificações técnicas aprofundadas foram modularizadas nos seguintes guias:
* 🗃️ **[Modelos de Dados e Interfaces (TypeScript)](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/docs/DATA_MODELS.md)**: Detalha as tipagens do TypeScript e payloads usados no fluxo administrativo de papéis, convites e equipes.
* 🔌 **[Endpoints e Integração de APIs](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/docs/API_ENDPOINTS.md)**: Lista o mapeamento de requisições HTTP entre os serviços do frontend Angular e os controllers do backend NestJS.
* 🔐 **[Regras de Permissão e Políticas ABAC](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/docs/ABAC_POLICIES.md)**: Explica o isolamento multi-tenant N:N, regras de autopropriedade e controle de permissões.
