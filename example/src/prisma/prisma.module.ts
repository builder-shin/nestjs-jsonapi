import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * PrismaModule
 *
 * PrismaService를 전역으로 제공하는 모듈입니다.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
