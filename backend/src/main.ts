import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { UPLOAD_DIR, UPLOAD_URL_PREFIX } from './uploads/multer.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  // Serve uploaded files (logo, product images) statically. Not under /api.
  app.useStaticAssets(join(process.cwd(), UPLOAD_DIR), { prefix: UPLOAD_URL_PREFIX });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: config.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  const port = config.get<number>('APP_PORT') ?? 4000;
  await app.listen(port);
  Logger.log(`Backend running on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
