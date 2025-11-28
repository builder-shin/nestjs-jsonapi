import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";

/**
 * UserModule
 *
 * 사용자 관련 기능을 제공하는 모듈입니다.
 */
@Module({
  controllers: [UserController],
})
export class UserModule {}
