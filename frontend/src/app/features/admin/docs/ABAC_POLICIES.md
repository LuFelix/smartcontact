# 🔐 Regras de Permissão e Políticas ABAC - Feature Admin

Este documento detalha o controle de acesso por papéis e atributos (**RBAC** / **ABAC**) e as regras visuais de modais exigidas na feature **Admin** (Console de Gestão do Workspace) do **SmartContact**.

---

## 🔒 1. Controle de Acesso Baseado em Roles (RBAC)

O console administrativo só é acessível e editável por usuários com privilégios de coordenação no Workspace.

### 🛡️ Nível de Restrição das Rotas Administrativas
* **Backend:** As rotas críticas são decoradas com `@Roles('administrador')` e monitoradas pelo `RolesGuard` integrado à `JwtStrategy` NestJS. Isso impede que colaboradores comuns interceptem ou façam requests diretos para endpoints de escrita:
  * Criar/Excluir papéis customizados (`POST /roles/create`, `DELETE /roles/:id`).
  * Convidar novos membros ou gerar links de convite (`POST /team/members`, `POST /team/invitations`).
  * Excluir membros da equipe (`DELETE /team/members/:id`).
  * Cadastrar ou excluir tags do estoque do Workspace (`POST /tags`, `DELETE /tags/:id`).
* **Frontend:** Menus de configuração de equipe, tags e permissões de sistema são protegidos pelo `PermissionGuard` ou ocultados da árvore de renderização do painel administrativo se a role resolvida do usuário não contiver privilégios administrativos.

---

## 🎨 2. Padrão de Modais Administrativas (ABAC Modals)

O sistema exige modais confortáveis e espaçosas para evitar truncamento de listas longas (como delegações de tags e edição de perfil).

* **Dimensões Obrigatórias:** Abertura ampla com largura fixa de **900px a 1000px** (ou `95vw` para telas menores).
* **Parâmetros Angular Material:**
  ```typescript
  this.dialog.open(ResourceDelegationDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'large-abac-modal', // Classe CSS global para estilização
      autoFocus: false               // Evita que o foco inicial quebre a rolagem
  });
  ```
* **Componentes que implementam este padrão:**
  * `ResourceDelegationDialogComponent` (Delegar tags para membros no [team-manager.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/pages/team-manager/team-manager.ts))
  * `TagDialogComponent` (Modificar propriedades da tag no [tag-manager.component.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/pages/tag-manager/tag-manager.component.ts))

---

## 🏗️ 3. Filtros Estruturais e Contexto Reativo

### Filtro de Membros
* **Regra:** O `team-manager` consome a API geral de listagem de usuários do tenant. Para que contatos comuns (leads capturados no menu "Meus Leads") não sejam exibidos misturados aos funcionários no console administrativo, o frontend filtra os dados recebidos mantendo apenas aqueles que possuem perfil instanciado:
  ```typescript
  this.members = (res.data || []).filter((u: FullUserResponse) => !!u.profile);
  ```

### Atualização Reativa de Estoque (Signal Watcher)
* **Regra:** O estoque de tags visível no [tag-manager.component.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/admin/pages/tag-manager/tag-manager.component.ts) deve mudar instantaneamente quando o administrador troca de workspace ativo.
* **Implementação:** O componente escuta reativamente o signal `activeTenantId` usando a ponte RxJS no construtor:
  ```typescript
  constructor() {
    toObservable(this.authService.activeTenantId).subscribe(() => {
      this.loadTags();
    });
  }
  ```
  Isso garante que, a cada chaveamento de workspace, a lista de tags do estoque antigo seja desalocada e as tags do novo workspace sejam carregadas sem necessidade de recarregar a página.
