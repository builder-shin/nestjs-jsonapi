import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

/**
 * NestJS JSON:API 예제 애플리케이션 진입점
 */
async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // 전역 유효성 검사 파이프 설정
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

  // CORS 활성화 (개발 환경)
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 애플리케이션이 http://localhost:${port} 에서 실행 중입니다`);
  logger.log(`📚 JSON:API 엔드포인트:`);
  logger.log(`   - GET    /users          - 사용자 목록`);
  logger.log(`   - GET    /users/:id      - 사용자 상세`);
  logger.log(`   - POST   /users          - 사용자 생성`);
  logger.log(`   - PATCH  /users/:id      - 사용자 수정`);
  logger.log(`   - DELETE /users/:id      - 사용자 삭제`);
  logger.log(`   - GET    /articles       - 게시글 목록`);
  logger.log(`   - GET    /articles/:id   - 게시글 상세`);
  logger.log(`   - POST   /articles       - 게시글 생성`);
  logger.log(`   - PATCH  /articles/:id   - 게시글 수정`);
  logger.log(`   - DELETE /articles/:id   - 게시글 삭제`);
  logger.log(`   - POST   /articles/:id/publish - 게시글 발행`);
  logger.log(`   - POST   /articles/:id/archive - 게시글 보관`);
  logger.log(`   - GET    /comments       - 댓글 목록`);
  logger.log(`   - GET    /comments/:id   - 댓글 상세`);
  logger.log(`   - POST   /comments       - 댓글 생성`);
  logger.log(`   - PATCH  /comments/:id   - 댓글 수정`);
  logger.log(`   - DELETE /comments/:id   - 댓글 삭제`);
}

bootstrap();
