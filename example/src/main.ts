import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

/**
 * NestJS JSON:API Example Application Entry Point
 */
async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Note: The extended Express query parser for JSON:API filtering
  // is automatically configured by JsonApiModule.

  // Global validation pipe configuration
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Enable CORS (development environment)
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running at http://localhost:${port}`);
  logger.log(`📚 JSON:API Endpoints:`);
  logger.log(`   - GET    /users          - List users`);
  logger.log(`   - GET    /users/:id      - Get user details`);
  logger.log(`   - POST   /users          - Create user`);
  logger.log(`   - PATCH  /users/:id      - Update user`);
  logger.log(`   - DELETE /users/:id      - Delete user`);
  logger.log(`   - GET    /articles       - List articles`);
  logger.log(`   - GET    /articles/:id   - Get article details`);
  logger.log(`   - POST   /articles       - Create article`);
  logger.log(`   - PATCH  /articles/:id   - Update article`);
  logger.log(`   - DELETE /articles/:id   - Delete article`);
  logger.log(`   - POST   /articles/:id/publish - Publish article`);
  logger.log(`   - POST   /articles/:id/archive - Archive article`);
  logger.log(`   - GET    /comments       - List comments`);
  logger.log(`   - GET    /comments/:id   - Get comment details`);
  logger.log(`   - POST   /comments       - Create comment`);
  logger.log(`   - PATCH  /comments/:id   - Update comment`);
  logger.log(`   - DELETE /comments/:id   - Delete comment`);
}

bootstrap();
