// auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  
} from '@nestjs/common';
import { AuthService } from './auth.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto, MinimalRegisterDto, VerifyEmailDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { GoogleLoginDto } from './dto/google-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from './decorators/get-user.decorator';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Registrar um novo usuário' })
  @ApiBody({ type: MinimalRegisterDto })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Usuário com este e-mail já existe' })
  async register(@Body() minimalRegisterDto: MinimalRegisterDto) {
    const email = await this.authService.register(minimalRegisterDto);
    return { message: 'Usuário registrado com sucesso', email };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verificar código de e-mail' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'E-mail verificado com sucesso' })
  @ApiResponse({ status: 401, description: 'Código inválido ou expirado' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmailCode(verifyEmailDto.email, verifyEmailDto.code);
  }

  @Public() // Garante que essa rota não exige JWT para ser acessada
  @Post('google')
  @ApiOperation({ summary: 'Login com conta do Google' })
  @ApiBody({ type: GoogleLoginDto })
  async googleLogin(@Body() data: GoogleLoginDto) {
     return this.authService.loginWithGoogle(data);
  }

  @Post('login')
  @ApiOperation({ summary: 'Fazer login do usuário' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'CPF ou senha inválidos' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.login(loginDto);
    return {
      message: 'Login realizado com sucesso',
      access_token: user.access_token,
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('my-workspaces')
  @ApiOperation({ summary: 'Listar meus workspaces (Memberships)' })
  async myWorkspaces(@GetUser() currentUser: any) {
    return this.authService.getMyWorkspaces(currentUser.sub);
  }
}
