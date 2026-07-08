# 🔐 Regras de Permissão e Políticas ABAC - Backend

Este documento detalha o motor de autorização, as regras de controle de acesso baseado em atributos/funções (**ABAC** / **RBAC**) e o isolamento multi-tenant aplicados no backend NestJS do **SmartContact**.

---

## 🔑 1. Identidade Global vs. Contexto Dinâmico (`JwtStrategy`)

O sistema adota um modelo onde a conta do usuário é global (um único e-mail/senha permite acesso a todo o SaaS), porém suas permissões de escrita e leitura de recursos são escopadas dinamicamente de acordo com o Workspace ativo.

* **Arquivo:** [jwt.strategy.ts](file:///home/jaspion/projetos/smartcontact/backend/src/auth/strategies/jwt.strategy.ts)

### Fluxo de Validação do Contexto
1. Ao receber qualquer requisição autenticada, a estratégia extrai o Token JWT e lê o cabeçalho `X-Tenant-ID` enviado pelo frontend.
2. **Super Admin Bypass:** Se o token contiver `isSuperAdmin: true`, o usuário é autenticado com acesso global e as travas locais do tenant são ignoradas.
3. **Resolução de Cargo Dinâmico:** Para usuários normais, o backend consulta a tabela pivot `memberships` buscando o cargo real dele no workspace chaveado:
   ```typescript
   const membership = await this.membershipsService.findByUserAndTenant(payload.sub, tenantId);
   ```
   * Se a membership existir, a requisição é injetada com o cargo local dinâmico (`membership.role.name` - ex: `"administrador"` ou `"usuario"`). Esse cargo é usado pelo `RolesGuard` para permitir ou barrar o acesso à rota.
   * Se a membership não existir, a requisição é negada (`UnauthorizedException: Você não tem acesso a este Workspace.`), **exceto no caso de Autopropriedade (Self-ownership)**.

### 🛡️ Bypass de Autopropriedade (Self-ownership Bypass)
Se o usuário tentar acessar seu próprio perfil (ex: rota de leitura ou atualização `/users/:id` onde o `:id` é igual ao `sub` do token JWT), mas o frontend enviou um `X-Tenant-ID` de um workspace do qual ele foi desvinculado, a `JwtStrategy` intercepta a requisição e **permite o acesso de leitura/escrita aos próprios dados de login global**:
```typescript
const isOwnProfile = req.url?.includes(`/users/${payload.sub}`);
if (isOwnProfile) {
    return { sub: payload.sub, role: payload.role, tenantId: payload.tenantId, ... };
}
```

---

## 🏗️ 2. Isolamento de Consultas Multi-Tenant

Para mitigar qualquer possibilidade de vazamento de dados corporativos entre clientes (Multi-Tenant isolation), as rotas que manipulam recursos (usuários, tags, leads) filtram as queries baseando-se no `tenantId` obtido no contexto do request.

### Exemplo de Filtro no `UsersService`
Ao listar usuários de um tenant, o backend faz o seguinte filtro SQL via QueryBuilder:
```typescript
const query = this.usersRepository.createQueryBuilder('user')
  .innerJoin('user.memberships', 'membership')
  .where('membership.tenantId = :tenantId', { tenantId });
```

---

## 🔒 3. Regras de Negócio e Privilégios (ABAC)

O backend implementa políticas rígidas para gerenciamento e delegação de tags e equipe.

### 👥 Promoção e Rebaixamento de Membros
* **Promoção (`promoteToTeam`):** Se o usuário a ser promovido para vendedor já existir no banco global, o sistema localiza seu cadastro global e cria/atualiza sua pivot `memberships` ligando-o à `role` e gerando um `profile` local. Não são recriadas credenciais de e-mail e senha.
* **Rebaixamento (`demoteFromTeam`):** Ao demitir ou desvincular um membro do time no painel:
  1. A role local na membership é alterada para `usuario`.
  2. O campo `profile_id` na membership é setado como `null`.
  3. A tag vinculada ao usuário para aquele tenant é deletada.
  4. O cadastro global de login do usuário é preservado, permitindo que ele continue pertencendo a outros workspaces.

### 🏷️ Delegação e Modificação de Tags (Recursos)
* **Bypass Administrativo:** Apenas usuários com a role dinâmica local `"administrador"` (ou `SuperAdmin`) podem delegar tags (`grantAccess`), revogar acessos (`revokeAccess`) ou excluir recursos do estoque do tenant.
* **Bypass de Autopropriedade de Tags:** Para atualizar modos de redirecionamento ou URLs customizadas de uma tag (`PATCH /tags/:id`), o backend (`TagsService`) verifica se a tag pertence ao usuário (`tag.userId === currentUser.sub` ou `tag.ownerId === currentUser.sub`). Se pertencer, a edição é liberada mesmo que ele não seja um administrador.
