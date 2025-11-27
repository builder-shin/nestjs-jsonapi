import { Module } from '@nestjs/common';
import { JsonApiModule } from '../../../src';
import { PrismaService } from './prisma.service';
import { ArticleController } from './article.controller';
import { ArticleSerializer } from './article.serializer';

@Module({
  imports: [
    JsonApiModule.forRoot({
      pagination: {
        defaultLimit: 20,
        maxLimit: 100,
      },
      baseUrl: 'http://localhost:3000',
      prismaServiceToken: 'PRISMA_SERVICE',
    }),
  ],
  controllers: [ArticleController],
  providers: [
    PrismaService,
    {
      provide: 'PRISMA_SERVICE',
      useExisting: PrismaService,
    },
    ArticleSerializer,
  ],
})
export class AppModule {}
