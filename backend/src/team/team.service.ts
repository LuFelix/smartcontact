import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TeamService {
  constructor(private readonly usersService: UsersService) {}

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
}
