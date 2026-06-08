// Caminho: src/app/features/shared/models/users.models.ts

// --- Interface para Payload JWT (Usada pelo AuthService) ---
export interface JwtPayload {
    sub: string; // User ID (geralmente string UUID ou número como string)
    name: string;
    email: string;
    username?: string;
    role: string;
    tenantId?: string;
    ownerId?: string;
    isSuperAdmin?: boolean;
    picture?: string;
    iat?: number;
    exp?: number;
}

// --- Interfaces para API de Listagem/Filtro ---
export interface UserApiParams {
  page: number;
  limit: number;
  name?: string | null;
  email?: string | null;
  cpf?: string | null;
}

export interface UserApiResponse {
  data: User[];
  total: number;
}

export interface Phone {
    id: string;
    number: string;
    isWhatsapp: boolean;
    isMain: boolean;
}

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

export enum RedirectMode {
  PROFILE = 'PROFILE',
  WHATSAPP = 'WHATSAPP',
  VCARD = 'VCARD',
  CUSTOM_URL = 'CUSTOM_URL',
}

export enum TechnologyType {
  NFC_HF = 'NFC_HF',
  RFID_UHF = 'RFID_UHF',
  QR_CODE = 'QR_CODE',
}

export enum ApplicationType {
  REDIRECT = 'REDIRECT',
  ASSET_COUNTING = 'ASSET_COUNTING',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
}

export interface Tag {
  id: string;
  uuid: string;
  uid?: string | null;
  name?: string | null;
  technologyType: TechnologyType;
  applicationType: ApplicationType;
  value?: string | null;
  nfcRedirectMode: RedirectMode;
  nfcCustomUrl?: string | null;
  qrRedirectMode: RedirectMode;
  qrCustomUrl?: string | null;
  userId: string;
  tenantId: string;
  isActive: boolean;
  user?: User;
}

export enum AddressTag {
  HOME = 'HOME',
  WORK = 'WORK',
  BILLING = 'BILLING',
  DELIVERY = 'DELIVERY',
  OTHER = 'OTHER',
}

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

// --- Interface Básica do Usuário (Listagem) ---
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
}

// --- Interface para Registro (Usada pelo AuthService) ---
export interface RegistrationData {
  token?: string; 
  invitationToken?: string;
  cpf?: string;
  name: string;
  email: string;
  password: string;
}

// --- Interface para Dados do Usuário no LocalStorage/Componentes ---
export interface UserData {
    id: string;         
    email: string;      
    name: string;       
    username?: string;
    role: string;       
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
    phones?: Phone[];
    addresses?: Address[];
}

// Interface completa retornada pelo backend
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
  tagAccesses?: { id: string, tag: Tag }[];
  profilePictureUrl?: string;
}
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
