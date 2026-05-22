// Caminho: src/app/features/shared/models/users.models.ts

// --- Interface para Payload JWT (Usada pelo AuthService) ---
export interface JwtPayload {
    sub: string; // User ID (geralmente string UUID ou número como string)
    name: string;
    email: string;
    role: string;
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
  id: string; // Mudado para string (UUID)
  name: string;
  email: string;
  cpf?: string;
  isActive?: boolean;
  role?: { id: string, name: string };
  phones?: Phone[];
  addresses?: Address[];
  secondaryEmails?: SecondaryEmail[];
}

// --- Interface para Registro (Usada pelo AuthService) ---
export interface RegistrationData {
  token?: string; 
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
  cpf?: string; 
  isVerified: boolean;
  role: { id: string, name: string };
  phones?: Phone[];
  addresses?: Address[];
  secondaryEmails?: SecondaryEmail[];
  profilePictureUrl?: string; 
}
