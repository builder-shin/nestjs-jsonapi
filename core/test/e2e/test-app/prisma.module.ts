import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Mock Prisma Module (Global)
 *
 * Provides PrismaService globally for testing.
 * Allows JsonApiModule to access the 'PRISMA_SERVICE' token.
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
