# 🗃️ Modelos de Dados e Interfaces - Feature Admin

Este documento detalha os modelos de dados e as interfaces TypeScript utilizados na feature **Admin** (console de gerenciamento do Tenant) no frontend do **SmartContact**.

As tipagens residem em:
* [role.model.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/shared/models/role.model.ts) (Papéis e permissões do sistema)
* [team.service.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/core/services/team.service.ts) (Convites e membros)

---

## 🔐 1. Estrutura de Papéis e Permissões (`Role` e `Permission`)

O controle de acesso é granulado com base no vinculo local do inquilino.

### `Role` (Papel/Função)
```typescript
export interface Role {
    id: string;             // UUID alinhado com o banco de dados
    name: string;           // Nome normalizado do papel (ex: 'administrador', 'colaborador')
    description: string;    // Descrição informativa
    permissions?: Permission[]; // Lista de permissões associadas
    isActive?: boolean;     // Status de ativação da role
}
```

### `Permission` (Permissão granular)
```typescript
export interface Permission {
    id: number;
    name: string;        // Código identificador (ex: 'READ_USERS', 'CREATE_USER')
    description: string; // Descrição legível da permissão
}
```

### `RolesApiResponse`
Usado na listagem paginada de funções.
```typescript
export interface RolesApiResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### DTOs de Manipulação de Roles
```typescript
export interface CreateRoleDTO {
    name: string;
    description: string;
    permissionIds?: number[]; // Lista de IDs de permissões vinculadas
}

export interface UpdateRoleDTO extends CreateRoleDTO {
    isActive?: boolean;
}
```

---

## 👥 2. Estrutura de Equipe e Convites

### `CreateMemberData`
Payload enviado ao convidar ou adicionar diretamente um novo membro ao time do Tenant.
```typescript
export interface CreateMemberData {
  name: string;
  email: string;
  password?: string;
  roleId: string;
}
```

### `InvitationResponse` (Token de Convite)
Representa um token gerado para compartilhar com novos colaboradores. O link gerado permite que novos usuários criem conta ou entrem diretamente no Tenant com o papel pré-estabelecido.
```typescript
export interface InvitationResponse {
  id: string;
  token: string;
  tenantId: string;
  roleId: string;
  expiresAt: string;
  isActive: boolean;
}
```
