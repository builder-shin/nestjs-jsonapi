import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * PrismaService
 *
 * Prisma 클라이언트를 NestJS 서비스로 래핑합니다.
 * 애플리케이션 시작/종료 시 데이터베이스 연결을 관리합니다.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
