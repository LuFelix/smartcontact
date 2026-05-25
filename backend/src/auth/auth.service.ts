// auth/auth.service.ts
import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { ProfilesService } from 'src/profiles/profiles.service';
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
    private readonly mailerService: MailerService
    
  ) { }

 async register(registerDto: MinimalRegisterDto): Promise<string> {
  
    // 1. Log de entrada para comparar com o Postman
    console.log('[DEBUG] Dados recebidos do Angular:', registerDto);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);
    
    // 2. Garanta que o CreateUserDto tenha o que o banco pede
    const createUserDto = {
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
    };

    // Novo usuário ganha um tenant próprio (empresa de um homem só)
    const newTenantContext = {
        tenantId: uuidv4(),
        sub: null // Indica que é um registro público, o UsersService cuidará do owner
    };

    const user = await this.usersService.create(createUserDto, newTenantContext);

    await this.usersService.setVerificationData(user.id, code, expires);

    try {
      await this.mailerService.sendMail({
      to: user.email,
      subject: 'Seu código de verificação',
      text: `Olá ${user.name}, seu código de verificação é: ${code}.`,
    });

  } catch (mailError: any) {
       console.error('Falha ao enviar e-mail HostGator, mas cadastro OK:', mailError.message);
  }

  return user.email; // O servidor vai responder 201 agora!
    
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

      const payload = { 
          sub: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role?.name || 'usuario',
          ownerId: user.ownerId,
          tenantId: user.tenantId,
          isSuperAdmin: user.isSuperAdmin
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
      
      // Valida o token com o servidor do Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payloadGoogle = ticket.getPayload();
      if (!payloadGoogle || !payloadGoogle.email) {
        throw new UnauthorizedException('Token do Google inválido');
      }

      // Busca o usuário no banco (pelo e-mail que o Google garantiu que é dele)
      let user = await this.usersService.findByEmail(payloadGoogle.email);

      // Se o usuário não existe, faz o "Silent Registration"
      if (!user) {
        const newUserContext = {
            tenantId: uuidv4(),
            sub: null
        };
        
        user = await this.usersService.create({
          email: payloadGoogle.email,
          name: payloadGoogle.name || 'Usuário Google',
          password: Math.random().toString(36).slice(-10), // Senha aleatória "dummy"
        }, newUserContext, payloadGoogle.picture);

        // Como o Google já validou o e-mail, marcamos como verificado direto
        await this.usersService.markEmailAsVerified(user.id);
        
        // Recarrega o usuário para pegar as roles/relações corretamente
        user = await this.usersService.findByEmail(payloadGoogle.email);
      } else {
          // Se o usuário já existe mas não tem perfil (correção de "apagão")
          const profile = await this.profilesService.findByUserId(user.id);
          if (!profile) {
              await this.profilesService.create({
                  userId: user.id,
                  ownerId: user.ownerId!,
                  tenantId: user.tenantId!,
                  profilePictureUrl: payloadGoogle.picture
              });
          }

          // Se o usuário já existe mas não tem Tag (correção de botão sumido)
          if (!user.tags || user.tags.length === 0) {
              await this.usersService.ensureHasDefaultTag(user);
          }
      }
      if (!user) {
        throw new InternalServerErrorException('Erro ao processar ou criar usuário via Google');
      }
      // Gera o JWT com o MESMO payload do seu login por senha
      const payload = { 
        sub: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role?.name || 'USER', // Fallback caso a role demore a carregar
        ownerId: user.ownerId,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin
      };

      return {
        access_token: await this.jwtService.signAsync(payload),
      };

    } catch (error: unknown) {
        // 1. Verificamos se o erro é uma instância de Error para acessar .message
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        console.error('[AuthService Google] Erro:', errorMessage);

        // 2. Lançamos a exceção do NestJS
        throw new UnauthorizedException('Falha na autenticação com Google');
    }
  }

}
