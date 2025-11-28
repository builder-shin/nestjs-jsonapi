import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Mock Prisma Module (Global)
 *
 * 테스트용 PrismaService를 전역으로 제공합니다.
 * JsonApiModule이 'PRISMA_SERVICE' 토큰에 접근할 수 있도록 합니다.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'PRISMA_SERVICE',
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, 'PRISMA_SERVICE'],
})
export class PrismaModule {}
