import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { User } from '../users/entities/user.entity';
import { GroupInvitation } from './entities/group-invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TeamService {
  constructor(
    private readonly usersService: UsersService,
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
    const { name, email, password, roleId } = createMemberDto;

    // Apenas administradores de tenant podem convidar membros
    if (currentUser.role !== 'administrador' && !currentUser.isSuperAdmin) {
      throw new BadRequestException('Apenas administradores podem adicionar membros à equipe.');
    }

    // Criamos o contexto do novo usuário:
    // 1. tenantId: Sempre o mesmo do administrador que o convidou.
    // 2. sub (quem criou): O administrador logado.
    const newUserContext = {
      tenantId: currentUser.tenantId,
      sub: currentUser.sub
    };

    const userDto = {
      name,
      email,
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

    // Usamos o findAll do UsersService que já possui o filtro por tenantId
    return this.usersService.findAll(1, 100, undefined, undefined, undefined, currentUser);
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
    
    // Buscar o usuário logado para garantir que ele existe e obter seus dados atuais
    const user = await this.userRepository.findOne({ 
        where: { id: currentUser.sub },
        relations: ['role']
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // SEGURANÇA: Se o usuário já pertence ao tenant do convite, não faz nada
    if (user.tenantId === invitation.tenantId) {
        return { message: 'Você já faz parte desta equipe.' };
    }

    // SEGURANÇA: Se o usuário é um Administrador (e não está apenas trocando de tenant por convite legítimo)
    // podemos querer bloquear para evitar perda de acesso acidental ao seu próprio tenant.
    if (user.role?.name === 'administrador' && !currentUser.isSuperAdmin) {
        // Se for um admin real, avisamos que ele perderá o controle da sua empresa atual
        // Mas por simplicidade de fluxo B2B, vamos apenas permitir se o tenantId for diferente.
        // O ideal é que admins não aceitem convites de outros.
        console.warn(`[TeamService] Admin ${user.email} aceitando convite para outro tenant.`);
    }

    // Atualizar o usuário para o novo Tenant e Role
    await this.userRepository.update(user.id, {
      tenantId: invitation.tenantId,
      role: { id: invitation.roleId } as any,
    });

    return { message: 'Você entrou na equipe com sucesso!' };
  }

  /**
   * Remove um membro da equipe (desvincula do Tenant).
   */
  async removeMember(memberId: string, currentUser: any): Promise<void> {
      if (currentUser.role !== 'administrador' && !currentUser.isSuperAdmin) {
          throw new BadRequestException('Apenas administradores podem remover membros da equipe.');
      }

      const member = await this.userRepository.findOne({ where: { id: memberId } });
      if (!member) {
          throw new NotFoundException('Membro não encontrado.');
      }

      if (member.tenantId !== currentUser.tenantId) {
          throw new BadRequestException('Este usuário não pertence à sua equipe.');
      }

      // Desvincular do Tenant (setar tenantId para null)
      // Nota: Em um sistema B2B real, poderíamos mover para um tenant 'LIXO' ou apenas remover o acesso.
      await this.userRepository.update(memberId, { 
          tenantId: null,
          role: null 
      });
  }
}
