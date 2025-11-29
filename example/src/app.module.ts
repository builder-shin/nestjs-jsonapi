import { Module } from "@nestjs/common";
import { JsonApiModule } from "@builder-shin/nestjs-jsonapi";
import { PrismaModule, PrismaService } from "./prisma";
import { UserModule } from "./users";
import { ArticleModule } from "./articles";
import { CommentModule } from "./comments";

/**
 * AppModule
 *
 * The root module of the application.
 * Integrates JSON:API module with each resource module.
 */
@Module({
  imports: [
    // Prisma module (global)
    PrismaModule,

    // JSON:API module configuration
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

    // Resource modules
    UserModule,
    ArticleModule,
    CommentModule,
  ],
})
export class AppModule {}
