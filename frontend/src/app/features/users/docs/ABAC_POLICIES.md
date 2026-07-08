# 🔐 Regras de Permissão e Políticas ABAC - Feature Users

Este documento descreve as políticas de segurança baseadas em papéis e atributos (**RBAC** / **ABAC**) e o comportamento multi-tenant N:N aplicado à feature **Users** no **SmartContact**.

---

## 👥 1. Tipos de Membros e Escopo de Acesso

Um usuário possui uma conta global, porém suas permissões de alteração e leitura são resolvidas em tempo de execução com base no Tenant selecionado. Isso é gerenciado pela tabela `memberships`.

### Papéis Disponíveis
1. **Dono (Owner):** Criador do Workspace. Possui acesso total e irrestrito.
2. **Equipe (Member):** Possui um `profile_id` ativo vinculado à membership. Aparece no console de gestão e compartilha recursos do time.
3. **Usuário Standard:** Pertence ao Tenant mas não possui perfil ativo vinculado à membership (`profile_id` é nulo). Possui apenas acesso ao painel de configurações básico de seu próprio perfil e tags delegadas.
4. **Lead (Contato):** Role `"contato"` (sem credenciais de acesso). São contatos capturados externamente via leitura de tag pública que podem ser promovidos a membros da equipe.

---

## 🏗️ 2. Arquitetura Multi-Tenant N:N

### Isolamento de Dados
* **Backend:** Toda consulta ao banco de dados passa pela validação do inquilino. O QueryBuilder filtra consultas anexando `WHERE tenant_id = :tenantId`.
* **Frontend:** O `AuthService` monitora o workspace ativo através do signal `activeTenantId` e guarda a preferência no LocalStorage (`active_tenant_id`).
* **Interceptação de Contexto:** Um interceptor HTTP anexa dinamicamente o header `X-Tenant-ID` em todas as requisições enviadas ao servidor.

### Chaveamento de Contexto (Context Switcher)
Quando o usuário seleciona um novo Tenant na interface:
1. `authService.switchTenant(newTenantId)` é invocado.
2. O signal `activeTenantId` atualiza seu estado de forma reativa.
3. Os componentes inscritos (como `MyTagsComponent`) capturam a mudança e realizam o reload das informações correspondentes ao novo Tenant.

---

## 🔐 3. Regras de Políticas ABAC Específicas

O SmartContact implementa regras de controle de acesso refinadas baseadas no relacionamento do usuário com o recurso.

### 🛡️ Autopropriedade (Self-ownership Bypass)
* **Regra:** Um membro de equipe comum não tem autoridade para gerenciar ou editar dados e tags de outros funcionários. Porém, ele **deve** poder atualizar seu próprio perfil, trocar sua senha e alterar o modo de redirecionamento de suas próprias tags.
* **Implementação:** No backend (`UsersService` e `TagsService`), o código valida se o `userId` do recurso a ser alterado é idêntico ao `sub` do token JWT do usuário logado. Se sim, a operação de escrita é liberada, ignorando a trava administrativa (Bypass).

### 👥 Promoção e Rebaixamento de Equipe (Promoção vs Exclusão)
* **Promoção (`promoteToTeam`):** Se o usuário já existe na base global, o sistema apenas cria o registro pivot na tabela `memberships` associando o papel escolhido e gerando um perfil local. Não tenta recriar o usuário.
* **Rebaixamento (`demoteFromTeam`):** Quando um funcionário é removido da equipe pelo Admin:
  * O vínculo local no workspace é desfeito (a role local é alterada para `usuario` e o `profile_id` é setado para `null`).
  * O cadastro global de login do usuário **nunca é deletado** para que ele mantenha acesso a outros Tenants nos quais possui memberships.

---

## 🛠️ 4. Fluxo de Validação de Permissões no Frontend

O frontend implementa guards e signals para proteger as rotas e elementos visuais:

1. **Guarda de Rotas (`PermissionGuard`):**
   * Configurada no roteamento com `data: { permissions: ['READ_USERS', 'INVITE_USER'] }`.
   * Verifica via `authService.hasPermission(perm)` se o usuário possui todas as permissões necessárias. Caso contrário, redireciona para `/unauthorized`.
2. **Mock Atual vs Integração Futura:**
   * Atualmente, o método `fetchAndStorePermissions()` mocka as permissões de startup. 
   * A integração futura obterá a lista de permissões ativas dinamicamente de `GET /users/me/permissions` baseando-se no tenant chaveado.
