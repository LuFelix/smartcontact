# 🔌 Endpoints e Integração de APIs - Feature Users

Este documento detalha o mapeamento de comunicação HTTP entre os serviços do frontend (Angular) e as APIs expostas pelo backend (NestJS) para a feature **Users**.

Todos os endpoints autenticados exigem o cabeçalho `Authorization: Bearer <TOKEN>` e, no contexto multi-tenant, o cabeçalho `X-Tenant-ID: <TENANT_ID>` para isolamento de dados.

---

## 👤 1. Integrações do `UserService`
Gerencia dados cadastrais, ciclo de vida e a associação de membros ao Tenant. 
Serviço do Frontend: [user.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/users/services/user.service.ts)
Controller do Backend: [users.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/users/users.controller.ts)

| Método Frontend | Rota HTTP Backend | Tipo | Descrição |
| :--- | :--- | :---: | :--- |
| `findAllUsers(filters)` | `GET /users` | JSON | Consulta a lista de usuários no tenant. Suporta paginação (`page`, `limit`) e filtros de busca (`name`, `email`, `cpf`). |
| `findById(userId)` | `GET /users/:id` | JSON | Busca a árvore completa de dados do usuário (dados, perfil, contatos, tags). |
| `createUser(payload)` | `POST /users` | JSON | Cadastra um novo usuário/contato no banco global associado ao inquilino. |
| `updateUser(id, payload)` | `PATCH /users/:id` | JSON | Atualiza dados parciais do cadastro do usuário. |
| `deleteUser(id)` | `DELETE /users/:id` | Void | Remove fisicamente o usuário do sistema (Exclusivo Admin). |
| `promoteToTeam(userId, roleId, email)` | `POST /users/:userId/promote` | JSON | Promove um usuário (ex: um Lead/Contato existente) para Membro da Equipe vinculando-o a um papel (`roleId`). |
| `demoteFromTeam(userId)` | `DELETE /users/:userId/team` | Void | Rebaixa o membro removendo a associação local (limpa `profileId` e redefine a role local para 'usuario'), sem apagar sua conta global. |
| `exportUsers(filters)` | `GET /users/exportXlsx` | Blob | Exporta a planilha Excel filtrada contendo a listagem de membros. |

---

## 🏷️ 2. Integrações do `TagService`
Gerencia o estoque de tags do workspace e a delegação de privilégios para membros do tenant.
Serviço do Frontend: [tag.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/core/services/tag.service.ts)
Controller do Backend: [tags.controller.ts](file:///home/jaspion/projetos/smartcontact/backend/src/tags/tags.controller.ts)

| Método Frontend | Rota HTTP Backend | Tipo | Rota Pública? | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `resolveTag(uuid, source?)` | `GET /tags/resolve/:identifier` | JSON | **Sim** | Resolve o redirecionamento dinâmico a partir do UUID ou do username (handle). Se `source` (ex: `nfc` ou `qr`) for informado, registra a métrica de acesso. |
| `findAll()` | `GET /tags` | JSON | Não | Lista as tags sob gestão do Tenant. Admins visualizam todo o estoque; membros normais visualizam as suas. |
| `getMyDelegated()` | `GET /tags/my-delegated` | JSON | Não | Retorna as tags cujo controle foi delegado ao usuário logado no Workspace. |
| `create(tagData)` | `POST /tags` | JSON | Não | Cadastra um novo recurso no estoque do Workspace (Exclusivo Admin). |
| `update(tagId, tagData)` | `PATCH /tags/:id` | JSON | Não | Edita as propriedades e regras de redirecionamento dinâmico da tag (ex: alterar de `PROFILE` para `WHATSAPP`). |
| `delete(tagId)` | `DELETE /tags/:id` | Void | Não | Exclui fisicamente o recurso do estoque. |
| `grantAccess(tagId, userId)` | `POST /tags/:id/grant/:userId` | JSON | Não | Delega a responsabilidade de uma tag específica para outro usuário (Exclusivo Admin). |
| `revokeAccess(tagId, userId)` | `DELETE /tags/:id/revoke/:userId` | JSON | Não | Remove a delegação de acesso da tag para o usuário alvo (Exclusivo Admin). |

---

## 👤 3. Integrações de Captura de Leads e Logs
Gerencia a captação de dados nas páginas públicas e a listagem interna no painel do usuário.
Serviço do Frontend: [interaction-logs.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/core/services/interaction-logs.service.ts)
Controller do Backend: `interaction-logs.controller.ts`

| Método Frontend | Rota HTTP Backend | Tipo | Rota Pública? | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `captureLead(tagId, data)` | `POST /interaction-logs/capture-lead/:tagId` | JSON | **Sim** | Registra um lead capturado a partir do formulário de contato exibido no cartão público. |
| `listMyLeads()` | `GET /interaction-logs/leads` | JSON | Não | Retorna os leads capturados vinculados às tags associadas ou delegadas ao usuário logado. |

---

## 🌐 4. Integrações de Google Contacts (OAuth Frontend/Backend)
Gerencia a sincronização de contatos e exportação de leads para a conta pessoal do Google do usuário.
Serviço do Frontend: [google-contacts.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/core/services/google-contacts.service.ts)
Controller do Backend: `google-contacts.controller.ts`

| Método Frontend | Rota HTTP Backend | Tipo | Descrição |
| :--- | :--- | :---: | :--- |
| `syncContacts(token)` | `POST /integrations/google-contacts/sync` | JSON | Sincroniza em lote contatos do workspace com a conta do Google (envia o token OAuth obtido no frontend para o backend). |
| `saveLead(token, lead)` | `POST /integrations/google-contacts/save-lead` | JSON | Salva um lead individual como contato pessoal no Google Contacts. |
