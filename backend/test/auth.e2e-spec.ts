import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './../src/auth/auth.controller';
import { AuthService } from './../src/auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('POST /auth/login - should return token if login succeeds', async () => {
    mockAuthService.login.mockResolvedValueOnce({ access_token: 'mock_token' });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'john@email.com', password: 'password123' })
      .expect(201);

    expect(response.body).toEqual({ 
      access_token: 'mock_token',
      message: 'Login realizado com sucesso'
    });
    expect(mockAuthService.login).toHaveBeenCalledWith({
      identifier: 'john@email.com',
      password: 'password123',
    });
  });

  it('POST /auth/login - should return 401 if login fails', async () => {
    mockAuthService.login.mockRejectedValueOnce(new UnauthorizedException('Credenciais inválidas'));

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'wrong@email.com', password: 'bad' })
      .expect(401);
  });

  it('POST /auth/register - should return registered message and email', async () => {
    mockAuthService.register.mockResolvedValueOnce('john@email.com');

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'John Doe', email: 'john@email.com', password: 'Senha@1234' })
      .expect(201);

    expect(response.body).toEqual({
      message: 'Usuário registrado com sucesso',
      email: 'john@email.com'
    });
  });
});
