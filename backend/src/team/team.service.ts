import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { User } from '../users/entities/user.entity';
import { GroupInvitation } from './entities/group-invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TeamService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    @InjectRepository(GroupInvitation)
    private readonly invitationRepository: Repository<GroupInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Adiciona um novo membro ao time (Workspace).
   * O novo usuário herda o tenantId do administrador logado.
   */
  async addMember(createMemberDto: CreateMemberDto, currentUser: any): Promise<User> {
      // ... (rest of addMember)

    const { name, email, password, roleId } = createMemberDto;
    const emailNormalized = email?.trim().toLowerCase();

    // Apenas administradores de tenant podem convidar membros
    if (currentUser.role !== 'administrador' && !currentUser.isSuperAdmin) {
      throw new BadRequestException('Apenas administradores podem adicionar membros à equipe.');
    }

    // Verifica se o usuário já existe globalmente pelo e-mail
    const existingUser = await this.usersService.findByEmail(emailNormalized);
    if (existingUser) {
        console.log(`[TeamService] Usuário já existe (${emailNormalized}). Promovendo ao Workspace: ${currentUser.tenantId}`);
        // Se já existe, não criamos um novo. Apenas o promovemos (vinculamos) ao Workspace atual.
        // O método promoteToTeam já lida com a criação atômica do Profile e Role.
        return this.usersService.promoteToTeam(existingUser.id, roleId, currentUser, emailNormalized);
    }

    console.log(`[TeamService] Criando novo usuário (${emailNormalized}) no Workspace: ${currentUser.tenantId}`);
    // Criamos o contexto do novo usuário se não existir:
    // 1. tenantId: Sempre o mesmo do administrador que o convidou.
    // 2. sub (quem criou): O administrador logado.
    const newUserContext = {
      tenantId: currentUser.tenantId,
      sub: currentUser.sub
    };

    const userDto = {
      name,
      email: emailNormalized,
      password,
      roleId,
      isActive: true
    };

    // Criamos o usuário usando o motor global (isso já cria Profile e etc)
    return this.usersService.create(userDto as any, newUserContext);
  }

  /**
   * Lista todos os membros que pertencem ao mesmo Workspace (Tenant).
   */
  async listTeamMembers(currentUser: any) {
    const { tenantId } = currentUser;

    if (!tenantId) {
        throw new BadRequestException('Você não pertence a uma organização ativa.');
    }

    // Busca o tenant para obter o owner_id (fonte de verdade)
    const tenant = await this.tenantsService.findById(tenantId);

    // Usamos o findAll do UsersService que já possui o filtro por tenantId
    const result = await this.usersService.findAll(1, 100, undefined, undefined, undefined, currentUser);

    // Injeta flag visual baseada no owner_id do Tenant (afirmação no banco)
    if (tenant?.ownerId) {
        const ownerMember = result.data.find(u => u.id === tenant.ownerId);
        if (ownerMember) {
            (ownerMember as any).isTenantOwner = true;
        }
    }

    return result;
  }

  /**
   * Gera um novo convite de grupo.
   */
  async createInvitation(dto: CreateInvitationDto, currentUser: any): Promise<GroupInvitation> {
    if (currentUser.role !== 'administrador' && !currentUser.isSuperAdmin) {
      throw new BadRequestException('Apenas administradores podem gerar convites.');
    }

    const { roleId, expiresInHours = 48 } = dto;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const invitation = this.invitationRepository.create({
      token: uuidv4(),
      tenantId: currentUser.tenantId,
      roleId,
      expiresAt,
      createdById: currentUser.sub,
    });

    return this.invitationRepository.save(invitation);
  }

  /**
   * Valida um token de convite.
   */
  async resolveInvitation(token: string): Promise<GroupInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token, isActive: true },
      relations: ['tenant', 'role'],
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado ou inativo.');
    }

    if (new Date() > invitation.expiresAt) {
      invitation.isActive = false;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Este convite expirou.');
    }

    return invitation;
  }

  /**
   * Processa o aceite do convite pelo usuário logado.
   */
  async acceptInvitation(token: string, currentUser: any): Promise<{ message: string }> {
    const invitation = await this.resolveInvitation(token);
    
    // Buscar o usuário logado com suas memberships
    const user = await this.userRepository.findOne({ 
        where: { id: currentUser.sub },
        relations: ['memberships']
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // SEGURANÇA: Se o usuário já pertence ao tenant do convite, não faz nada
    const alreadyMember = user.memberships?.some(m => m.tenantId === invitation.tenantId);
    if (alreadyMember) {
        return { message: 'Você já faz parte desta equipe.' };
    }

    // Criar o novo vínculo de membership
    // (Opcional: se o convite exigir criação de perfil, faríamos aqui)
    await this.usersService.createMembershipForUser(user.id, invitation.tenantId, invitation.roleId);

    return { message: 'Você entrou na equipe com sucesso!' };
  }

  /**
   * Remove um membro da equipe (desvincula do Tenant).
   */
  async removeMember(memberId: string, currentUser: any): Promise<void> {
      const { tenantId, name, role, isSuperAdmin } = currentUser;

      console.log(`[TeamService] Tentativa de remover membro. Alvo ID: ${memberId}. Requisitante: ${name}. Role: ${role}. Tenant Context: ${tenantId}`);

      if (role !== 'administrador' && !isSuperAdmin) {
          throw new BadRequestException('Apenas administradores podem remover membros da equipe.');
      }

      if (!tenantId) {
          throw new BadRequestException('Contexto de Workspace não identificado no cabeçalho X-Tenant-ID.');
      }

      // Busca o usuário e checa se ele tem membership no tenant do admin
      const member = await this.userRepository.findOne({ 
          where: { id: memberId },
          relations: ['memberships']
      });

      if (!member) {
          throw new NotFoundException('Membro não encontrado.');
      }

      const hasMembership = member.memberships?.some(m => m.tenantId === tenantId);
      
      console.log(`[TeamService] Membro encontrado: ${member.name}. Vínculos: ${member.memberships?.map(m => m.tenantId).join(', ')}. Match com context: ${hasMembership}`);

      if (!hasMembership && !isSuperAdmin) {
          throw new BadRequestException('Este usuário não pertence à equipe deste Workspace.');
      }

      // Demite da equipe: Remove o Profile e altera a Role para 'usuario'
      await this.usersService.demoteFromTeam(memberId, currentUser);
  }
}
