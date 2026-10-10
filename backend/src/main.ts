// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Raw body para webhooks (Stripe/MP precisam do body bruto para verificação de assinatura)
  app.use('/api/billing/webhook/stripe', express.raw({ type: 'application/json' }));
  app.use('/api/billing/webhook/mercadopago', express.raw({ type: 'application/json' }));

  // Habilita 'trust proxy' para capturar o IP real do cliente atrás do Nginx/Traefik
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter && httpAdapter.getInstance) {
    const instance = httpAdapter.getInstance();
    instance.set('trust proxy', 1);
  }

  // Set global prefix so all routes start with /api
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: ['http://localhost:4200', 'https://smartcontact.tiweb.app.br'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

    app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('TIWEB - API')
    .setDescription('Documentação da API com Swagger')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
