import { Module } from "@nestjs/common";
import { JsonApiModule } from "@builder-shin/nestjs-jsonapi";
import { PrismaModule, PrismaService } from "./prisma";
import { UserModule } from "./users";
import { ArticleModule } from "./articles";
import { CommentModule } from "./comments";

/**
 * AppModule
 *
 * 애플리케이션의 루트 모듈입니다.
 * JSON:API 모듈과 각 리소스 모듈을 통합합니다.
 */
@Module({
  imports: [
    // Prisma 모듈 (전역)
    PrismaModule,

    // JSON:API 모듈 설정
    JsonApiModule.forRoot({
      pagination: {
        defaultLimit: 20,
        maxLimit: 100,
      },
      baseUrl: "http://localhost:3000",
      prismaServiceToken: PrismaService,
      idType: "uuid",
      debug: true,
    }),

    // 리소스 모듈
    UserModule,
    ArticleModule,
    CommentModule,
  ],
})
export class AppModule {}
