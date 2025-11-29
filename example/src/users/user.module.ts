import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";

/**
 * UserModule
 *
 * Module that provides user-related functionality.
 */
@Module({
  controllers: [UserController],
})
export class UserModule {}
