# 🔌 Endpoints e Integração de APIs - Feature Admin

Este documento detalha o mapeamento de comunicação HTTP entre os serviços do painel administrativo (**Admin**) e as APIs do backend NestJS.

---

## 🔐 1. Serviços de Papéis e Funções (`RolesService`)
Serviço do Frontend: [roles.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/services/roles.service.ts)
Controller do Backend: [roles.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/roles/roles.controller.ts)

| Método Frontend | Rota HTTP Backend | Tipo | Descrição |
| :--- | :--- | :---: | :--- |
| `findAll(page, limit)` | `GET /roles` | JSON | Lista as roles ativas e customizadas no tenant. |
| `findOne(id)` | `GET /roles/:id` | JSON | Recupera os detalhes de uma role e suas permissões associadas. |
| `create(role)` | `POST /roles/create` | JSON | Cria um novo papel customizado dentro do tenant (Apenas Admin). |
| `update(id, role)` | `PUT /roles/:id` | JSON | Atualiza as informações de uma role customizada. |
| `delete(id)` | `DELETE /roles/:id` | Void | Remove permanentemente uma role customizada do tenant. |

---

## 👥 2. Serviços de Equipe e Convites (`TeamService`)
Serviço do Frontend: [team.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/core/services/team.service.ts)
Controller do Backend: [team.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/team/team.controller.ts) e [invitations.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/team/invitations.controller.ts)

| Método Frontend | Rota HTTP Backend | Tipo | Rota Pública? | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `listMembers()` | `GET /team/members` | JSON | Não | Lista os membros do workspace (usuários que possuem um perfil local ativo). |
| `addMember(data)` | `POST /team/members` | JSON | Não | Adiciona ou convida diretamente um novo membro ao tenant vinculando-o a um papel. |
| `removeMember(id)` | `DELETE /team/members/:id` | Void | Não | Exclui o vínculo de equipe do membro no workspace. |
| `createInvitation(roleId)` | `POST /team/invitations` | JSON | Não | Gera um token de convite reutilizável associado ao papel escolhido. |
| `resolveInvitation(token)` | `GET /invitations/resolve/:token` | JSON | **Sim** | Valida se o token de convite é ativo e recupera os dados básicos do inquilino. |
| `acceptInvitation(token)` | `POST /invitations/accept/:token` | JSON | Não | Associa a conta do usuário logado ao Tenant de destino usando o token fornecido. |

---

## 🏷️ 3. Serviços de Tags do Workspace (`TagService`)
O painel de gerenciamento de tags do administrador consome a API de `/tags` (detalhada no mapeamento de [Endpoints e Integração de APIs da feature Users](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/docs/API_ENDPOINTS.md)) para fins de:
* `findAll()`: Listar todo o estoque de tags do Tenant.
* `create()`: Cadastrar novas tags UUID de hardware.
* `delete()`: Remover tags quebradas ou perdidas do inventário.
