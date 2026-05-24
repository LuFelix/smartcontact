// Definição da Permissão (Permission)
export interface Permission {
    id: number;
    name: string; // Ex: 'READ_USERS', 'CREATE_CERTIFICATION'
    description: string;
}

// Definição da Função (Role)
export interface Role {
    id: string; // Alterado para string (UUID) para alinhar com o backend
    name: string; // Ex: 'Administrador', 'Candidato'
    description: string;
    permissions?: Permission[]; // Lista de permissões que esta função possui
    isActive?: boolean; 
}

// DTOs para Criação e Edição (Data Transfer Objects)
export interface CreateRoleDTO {
    name: string;
    description: string;
    permissionIds: number[]; // IDs das permissões a serem associadas
}

export interface UpdateRoleDTO extends CreateRoleDTO {
    isActive: boolean;
}