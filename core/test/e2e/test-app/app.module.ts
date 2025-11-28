import { Module } from '@nestjs/common';
import { JsonApiModule } from '../../../src';
import { PrismaModule } from './prisma.module';
import { ArticleController } from './article.controller';
import { WhitelistIgnoreArticleController } from './whitelist-ignore.controller';
import { WhitelistErrorArticleController } from './whitelist-error.controller';
import { WhitelistDisabledArticleController } from './whitelist-disabled.controller';
import { ArticleSerializer } from './article.serializer';

@Module({
  imports: [
    PrismaModule,
    JsonApiModule.forRoot({
      pagination: {
        defaultLimit: 20,
        maxLimit: 100,
      },
      baseUrl: 'http://localhost:3000',
      prismaServiceToken: 'PRISMA_SERVICE',
    }),
  ],
  controllers: [
    ArticleController,
    WhitelistIgnoreArticleController,
    WhitelistErrorArticleController,
    WhitelistDisabledArticleController,
  ],
  providers: [ArticleSerializer],
})
export class AppModule {}
