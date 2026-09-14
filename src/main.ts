import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ReplicaHeaderInterceptor } from './common/interceptors/replica-header.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ReplicaHeaderInterceptor());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Keyloop Unified Service Scheduler')
    .setDescription(
      'Scenario A backend: resource-constrained workshop appointment booking',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  const port: number = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
