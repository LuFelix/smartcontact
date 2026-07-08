# 🗃️ Modelos de Dados e Interfaces (TypeScript) - Feature Users

Este documento detalha os modelos de dados e as interfaces TypeScript que representam as entidades de negócio da feature **Users** no frontend do **SmartContact**. As definições principais residem no arquivo compartilhado [users.models.ts](file:///home/jaspion/projetos/smartcontact/frontend/src/app/features/shared/models/users.models.ts).

---

## 👤 1. Entidade Usuário (`User` e `FullUserResponse`)

O sistema opera de forma híbrida: a identidade do usuário é global, enquanto seus papéis, tags e dados de perfil são vinculados a Tenants (Multi-Tenant N:N).

### `User` (Interface básica de listagem)
Usada no console administrativo e exibições simplificadas.
```typescript
export interface User {
  id: string; 
  name: string;
  email: string;
  username?: string;
  cpf?: string;
  isActive?: boolean;
  role?: { id: string, name: string };
  profile?: {
    bio?: string;
    jobTitle?: string;
    company?: string;
    profilePictureUrl?: string;
  };
  phones?: Phone[];
  addresses?: Address[];
  secondaryEmails?: SecondaryEmail[];
  links?: UserLink[];
  tags?: Tag[];
  profilePictureUrl?: string;
  isTenantOwner?: boolean;
}
```

### `FullUserResponse` (Interface completa)
Retornada ao consultar os detalhes de um perfil para edição ou visualização completa.
```typescript
export interface FullUserResponse {
  id: string;
  name: string;
  email: string;
  username?: string;
  cpf?: string;
  isVerified: boolean;
  role: { id: string, name: string };
  profile?: {
    bio?: string;
    jobTitle?: string;
    company?: string;
    profilePictureUrl?: string;
  };
  phones?: Phone[];
  addresses?: Address[];
  secondaryEmails?: SecondaryEmail[];
  links?: UserLink[];
  tags?: Tag[];
  tagAccesses?: { id: string, tag: Tag }[]; // Acessos delegados a tags do Tenant
  profilePictureUrl?: string;
  isTenantOwner?: boolean;
}
```

---

## 🏷️ 2. Entidade Tag/Recurso (`Tag`)

Uma Tag representa um chip NFC físico ou um QR Code impresso associado a um determinado usuário para fins de redirecionamento dinâmico.

```typescript
export interface Tag {
  id: string;
  uuid: string;              // UUID único que aponta para a rota pública (/t/:uuid)
  handle?: string | null;     // Handle de link customizado (ex: /t/joao)
  uid?: string | null;        // Identificador físico único de hardware do chip NFC
  name?: string | null;
  technologyType: TechnologyType;
  applicationType: ApplicationType;
  value?: string | null;
  isResource: boolean;
  nfcRedirectMode: RedirectMode; // Modos: PROFILE, WHATSAPP, VCARD, CUSTOM_URL
  nfcCustomUrl?: string | null;
  qrRedirectMode: RedirectMode;
  qrCustomUrl?: string | null;
  userId: string;
  tenantId: string;
  isActive: boolean;
  user?: User;
}
```

### Enums Relacionados a Tags
```typescript
export enum RedirectMode {
  PROFILE = 'PROFILE',         // Renderiza a página padrão do cartão de visitas web
  WHATSAPP = 'WHATSAPP',       // Redireciona diretamente para o WhatsApp principal
  VCARD = 'VCARD',             // Inicia o download imediato do arquivo vCard (.vcf)
  CUSTOM_URL = 'CUSTOM_URL',   // Encaminha para uma URL externa customizada
}

export enum TechnologyType {
  NFC_HF = 'NFC_HF',           // Tag NFC de Alta Frequência
  RFID_UHF = 'RFID_UHF',       // Etiqueta RFID Industrial
  QR_CODE = 'QR_CODE',         // Código QR
  LINK = 'LINK',               // Apenas link amigável (handle)
}

export enum ApplicationType {
  REDIRECT = 'REDIRECT',       // Direcionamento dinâmico (Foco do SmartContact)
  ASSET_COUNTING = 'ASSET_COUNTING',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
}
```

---

## 📞 3. Sub-recursos de Contato

### `Phone` (Telefone)
Gerenciado dinamicamente via `FormArray` na tela de perfil. Apenas um número deve ser definido como WhatsApp principal.
```typescript
export interface Phone {
  id: string;
  number: string;
  isWhatsapp: boolean;
  isMain: boolean; // Indica se é o contato telefônico primário
}
```

### `Address` (Endereço)
```typescript
export interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  tag: AddressTag;
  isMain: boolean;
}

export enum AddressTag {
  HOME = 'HOME',
  WORK = 'WORK',
  BILLING = 'BILLING',
  DELIVERY = 'DELIVERY',
  OTHER = 'OTHER',
}
```

### `SecondaryEmail` e `UserLink`
```typescript
export interface SecondaryEmail {
  id: string;
  address: string;
  isVerified: boolean;
}

export interface UserLink {
  id: string;
  title: string;
  url: string;
}
```

---

## 👥 4. Entidade Lead (`Lead`)

Representa um contato capturado através do formulário na página pública do cartão de visitas de um usuário.

```typescript
export interface Lead {
  id: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  leadNote?: string;
  accessedAt: string;
  tagId: string;
  tag?: Tag;
  capturedByUserId?: string | null;
  capturedByUser?: {
    id: string;
    name: string;
    profile?: {
      profilePictureUrl?: string;
    }
  } | null;
}
```
