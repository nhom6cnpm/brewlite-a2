import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  });

  // Cấu hình Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('BrewLite API')
    .setDescription(
      'Tài liệu và công cụ kiểm thử API cho hệ thống đặt thức uống không dùng tiền mặt BrewLite',
    )
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT access_token để xác thực',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  // Đảm bảo endpoint /api/docs-json luôn phục vụ JSON spec
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/docs-json', (_req: Request, res: Response) => {
    res.json(document);
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`BrewLite API running on port ${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}
void bootstrap();
