# 🔌 Mapeamento de Rotas e Contratos de DTOs - Backend

Este documento serve como referência rápida para as rotas HTTP, controladores (Controllers) e objetos de transferência de dados (DTOs) que compõem a API REST do **SmartContact**.

---

## 👥 1. Módulo de Usuários (`UsersController`)
Gerencia o CRUD de pessoas físicas globais e associações ao Workspace.
* **Controller:** [users.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/users/users.controller.ts)

### `POST /users` (Criar Usuário)
* **DTO:** `CreateUserDto` ([user.dto.ts](file:///home/jaspion/projetos/smartcontact/backend/src/users/dto/user.dto.ts))
* **Campos Principais:** `name` (required), `email` (required, unique), `cpf` (length 11, optional), `password` (optional), `roleName` (optional).

### `GET /users` (Listar Usuários do Tenant)
* **Query Params:** `page` (default 1), `limit` (default 10), `name` (optional), `email` (optional), `cpf` (optional).

### `GET /users/:id` (Obter Dados Completos)
* Retorna a entidade completa populando relações de perfis, endereços, links secundários e tags atribuídas.

### `PATCH /users/:id` (Atualizar Cadastro)
* **DTO:** `UpdateUserDto` ([update-user.dto.ts](file:///home/jaspion/projetos/smartcontact/backend/src/users/dto/update-user.dto.ts))
* **Campos Editáveis:** dados cadastrais (`name`, `cpf`), perfil do cartão (`bio`, `jobTitle`, `company`), telefones, endereços, links de redes sociais e as chaves de redirecionamento global das tags.

---

## 🏷️ 2. Módulo de Tags e Roteador (`TagsController`)
Orquestra o estoque de tags físicas, chaves de gravação de chip e resolvedor público.
* **Controller:** [tags.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/tags/tags.controller.ts)

### `GET /tags/resolve/:identifier` (Rota Pública)
* **Função:** Ponto de entrada do NFC/QR Code físico. O identificador pode ser o `uuid` da tag ou o `username` (handle) amigável do perfil.
* **Query Params:** `source` (ex: `nfc` ou `qr` para auditoria).
* **Processamento:** Grava no histórico `InteractionLog` as informações de IP, user-agent (Browser/Device) e executa o redirecionamento.

### `POST /tags` (Inserir no Estoque)
* **DTO:** `CreateTagDto` ([create-tag.dto.ts](file:///home/jaspion/projetos/smartcontact/backend/src/tags/dto/create-tag.dto.ts))
* **Campos:** `uuid` (required), `uid` (NFC serial, optional), `name` (optional), `isResource` (boolean, default false).

### `PATCH /tags/:id` (Editar Redirecionamento da Tag)
* **DTO:** `UpdateTagDto` ([update-tag.dto.ts](file:///home/jaspion/projetos/smartcontact/backend/src/tags/dto/update-tag.dto.ts))
* **Campos:** `nfcRedirectMode` (Enum), `nfcCustomUrl`, `qrRedirectMode` (Enum), `qrCustomUrl`, `isActive`.

---

## 👥 3. Módulo de Equipe e Convites (`TeamController` & `InvitationsController`)
Controla o fluxo B2B de convites coletivos e entrada de novos vendedores no time.
* **Controllers:** [team.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/team/team.controller.ts) e [invitations.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/team/invitations.controller.ts)

### `POST /team/members` (Convidar Manualmente)
* **DTO:** `CreateMemberDto` ([create-member.dto.ts](file:///home/jaspion/projetos/smartcontact/backend/src/team/dto/create-member.dto.ts))
* **Campos:** `name`, `email`, `roleId` (UUID do papel a ser atribuído).

### `POST /team/invitations` (Gerar Link Coletivo)
* **DTO:** `CreateInvitationDto` ([create-invitation.dto.ts](file:///home/jaspion/projetos/smartcontact/backend/src/team/dto/create-invitation.dto.ts))
* **Campos:** `roleId` (Função que o convidado receberá ao acessar).

### `POST /invitations/accept/:token` (Entrar na Equipe)
* Recebe o token UUID do convite e anexa a conta logada do usuário ao Workspace emitente.

---

## 🔐 4. Módulo de Funções e Segurança (`RolesController`)
Controla as permissões de acesso locais.
* **Controller:** [roles.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/roles/roles.controller.ts)

### `POST /roles/create` (Criar Role Customizada)
* **DTO:** `CreateRoleDto` ([role.dto.ts](file:///home/jaspion/projetos/smartcontact/backend/src/roles/dto/role.dto.ts))
* **Campos:** `name`, `description`, `permissionIds` (array de números).
