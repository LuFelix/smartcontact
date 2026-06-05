// auth/auth.service.ts
import { Injectable, InternalServerErrorException, UnauthorizedException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { ProfilesService } from 'src/profiles/profiles.service';
import { TeamService } from 'src/team/team.service';
import { RolesService } from 'src/roles/roles.service';
import { TenantsService } from 'src/tenants/tenants.service';
import { MembershipsService } from 'src/memberships/memberships.service';
import { LoginDto, MinimalRegisterDto } from './dto/auth.dto';
import { GoogleLoginDto } from './dto/google-token.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class AuthService {

  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  
  constructor(
    private readonly usersService: UsersService,
    private readonly profilesService: ProfilesService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly rolesService: RolesService,
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: MembershipsService,
    @Inject(forwardRef(() => TeamService))
    private readonly teamService: TeamService
    
  ) { }

 async register(registerDto: MinimalRegisterDto): Promise<string> {

   // 1. Log de entrada para comparar com o Postman
   console.log('[DEBUG] Dados recebidos do Angular:', registerDto);

   const code = Math.floor(100000 + Math.random() * 900000).toString();
   const expires = new Date();
   expires.setMinutes(expires.getMinutes() + 15);

   let tenantId: string | null = null;
   let roleId: string | null = null;

   // 2. Se houver token de convite, resolvemos para pegar o Tenant e Role de destino
   if (registerDto.invitationToken) {
       try {
           const invitation = await this.teamService.resolveInvitation(registerDto.invitationToken);
           tenantId = invitation.tenantId;
           roleId = invitation.roleId;
       } catch (error) {
           console.warn(`[AuthService] Convite inválido ou expirado: ${registerDto.invitationToken}`);
           throw new BadRequestException('O convite utilizado é inválido ou expirou.');
       }
   } else {
       // BUSCA DINÂMICA DA ROLE DE ADMINISTRADOR para novo tenant pessoal (criado no UsersService)
       const adminRole = await this.rolesService.findOneByName('administrador');
       if (!adminRole) {
           throw new InternalServerErrorException('Configuração de sistema incompleta: Role administrador não encontrada.');
       }
       roleId = adminRole.id;
   }

   const createUserDto = {
       name: registerDto.name,
       email: registerDto.email,
       password: registerDto.password,
       roleId: roleId
   };

    const registrationContext = {
        tenantId: tenantId, // Se null, UsersService cuidará de criar um pessoal
        sub: null 
    };

    const user = await this.usersService.create(createUserDto, registrationContext);

    await this.usersService.setVerificationData(user.id, code, expires);

    try {
      await this.mailerService.sendMail({
      to: user.email as string,
      subject: 'Seu código de verificação',
      text: `Olá ${user.name}, seu código de verificação é: ${code}.`,
    });

  } catch (mailError: any) {
       console.error('Falha ao enviar e-mail HostGator:', mailError.message);
       // Se o e-mail for rejeitado por caixa inexistente (550), informamos o erro
       if (mailError.message.includes('550') || mailError.message.includes('Mailbox does not exist')) {
           throw new BadRequestException('Não foi possível enviar o e-mail de verificação. Verifique se o endereço está correto ou se a caixa de entrada existe.');
       }
  }

  return user.email as string;
    
}
  async verifyEmailCode(email: string, code: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (user.isVerified) {
      return { message: 'E-mail já está verificado' };
    }

    if (user.verificationCode !== code) {
      throw new UnauthorizedException('Código inválido');
    }

    if (!user.verificationExpires || new Date() > user.verificationExpires) {
      throw new UnauthorizedException('Código expirado ou inválido. Solicite um novo.');
    }

    // Sucesso! Atualiza o banco com o novo método semântico
    await this.usersService.markEmailAsVerified(user.id);

    return { message: 'E-mail verificado com sucesso. Você já pode fazer login.' };
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    try {
      const { identifier, password } = loginDto;
      let user;

      if (identifier.includes('@')) {
        user = await this.usersService.findByEmail(identifier);
      } else {
        const cleanCpf = identifier.replace(/\D/g, ''); 
        user = await this.usersService.findByCpf(cleanCpf);
      }

      if (!user) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        throw new UnauthorizedException('CPF ou senha inválidos');
      }

      if (!user.isVerified) {
        throw new UnauthorizedException('Por favor, verifique seu e-mail antes de acessar o sistema.');
      }

      // Escolhe o workspace ativo (por enquanto o primeiro da lista)
      const activeMembership = user.memberships && user.memberships.length > 0 ? user.memberships[0] : null;

      const payload = { 
          sub: user.id, 
          name: user.name, 
          email: user.email, 
          username: user.username,
          role: activeMembership?.role?.name || 'usuario',
          ownerId: user.ownerId,
          tenantId: activeMembership?.tenantId || null,
          isSuperAdmin: user.isSuperAdmin,
          picture: user.profile?.profilePictureUrl
      };
      
      const token = await this.jwtService.signAsync(payload);
      return {
        access_token: token,
      };
    } catch (error: any) {
      console.error('[AuthService Login] Erro Crítico:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao processar login. Verifique os logs do servidor.');
    }
  }

  async loginWithGoogle(loginDto: GoogleLoginDto): Promise<{ access_token: string }> {
    try {
      const { token, accessToken } = loginDto;
      
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payloadGoogle = ticket.getPayload();
      if (!payloadGoogle || !payloadGoogle.email) {
        throw new UnauthorizedException('Token do Google inválido');
      }

      let user = await this.usersService.findByEmail(payloadGoogle.email);

      if (!user) {
        let tenantId: string | null = null;
        let roleId: string | null = null;

        if (loginDto.invitationToken) {
            try {
                const invitation = await this.teamService.resolveInvitation(loginDto.invitationToken);
                tenantId = invitation.tenantId;
                roleId = invitation.roleId;
            } catch (error) {
                console.warn(`[AuthService Google] Convite inválido: ${loginDto.invitationToken}`);
            }
        }

        if (!roleId) {
            const adminRole = await this.rolesService.findOneByName('administrador');
            if (!adminRole) {
                throw new InternalServerErrorException('Configuração de sistema incompleta: Role administrador não encontrada.');
            }
            roleId = adminRole.id;
        }

        const newUserContext = {
            tenantId: tenantId, // Se null, criará um pessoal
            sub: null
        };
        
        user = await this.usersService.create({
          email: payloadGoogle.email,
          name: payloadGoogle.name || 'Usuário Google',
          password: Math.random().toString(36).slice(-10),
          roleId: roleId
        }, newUserContext, payloadGoogle.picture);

        await this.usersService.markEmailAsVerified(user.id);
        user = await this.usersService.findByEmail(payloadGoogle.email);
      } else {
          // O usuário já existe no banco (pode ter sido criado como lead ou já ter conta).
          
          // Atualiza a foto se necessário
          if (payloadGoogle.picture && user.profilePictureUrl !== payloadGoogle.picture) {
              await this.usersService.updateProfilePicture(user.id, payloadGoogle.picture);
              user.profilePictureUrl = payloadGoogle.picture;
          }

          // Se ele tiver convite pendente, tentamos resolver
          if (loginDto.invitationToken) {
              try {
                  const invitation = await this.teamService.resolveInvitation(loginDto.invitationToken);
                  const alreadyMember = user.memberships?.some(m => m.tenantId === invitation.tenantId);
                  if (!alreadyMember) {
                      await this.usersService.createMembershipForUser(user.id, invitation.tenantId, invitation.roleId);
                  }
              } catch (error) {
                  console.warn(`[AuthService Google] Convite inválido ou expirado no fluxo de conta existente: ${loginDto.invitationToken}`);
              }
          }

          // PARADIGMA GOOGLE DRIVE:
          // Todo usuário que faz login no sistema (não é mais apenas um contato) 
          // DEVE ter o seu próprio Workspace (Tenant Solo) onde ele é o dono (ownerId).
          const hasPersonalWorkspace = user.ownerId === user.id && user.memberships?.some(m => m.profile?.ownerId === user.id);
          
          if (!hasPersonalWorkspace) {
              user = await this.usersService.provisionPersonalWorkspace(user);
          } else {
              // Apenas recarrega as relações atualizadas
              user = await this.usersService.findByEmail(payloadGoogle.email);
          }
      }

      if (!user) {
        throw new InternalServerErrorException('Erro ao processar ou criar usuário via Google');
      }

      // O tenant ativo inicial será o primeiro workspace VÁLIDO (não-contato)
      const validWorkspaces = await this.membershipsService.findTeamWorkspacesByUser(user.id);
      const activeMembership = validWorkspaces.length > 0 ? validWorkspaces[0] : null;
      
      const finalPicture = activeMembership?.profile?.profilePictureUrl || user.profilePictureUrl || payloadGoogle.picture;

      const payload = { 
        sub: user.id, 
        name: user.name, 
        email: user.email, 
        username: user.username,
        role: activeMembership?.role?.name || 'usuario', 
        ownerId: user.ownerId,
        tenantId: activeMembership?.tenantId || null,
        isSuperAdmin: user.isSuperAdmin,
        picture: finalPicture
      };

      return {
        access_token: await this.jwtService.signAsync(payload),
      };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('[AuthService Google] Erro:', errorMessage);
        throw new UnauthorizedException('Falha na autenticação com Google');
    }
  }

  async getMyWorkspaces(userId: string) {
    return this.membershipsService.findTeamWorkspacesByUser(userId);
  }

}
