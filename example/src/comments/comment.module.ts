import { Module } from "@nestjs/common";
import { CommentController } from "./comment.controller";

/**
 * CommentModule
 *
 * 댓글 관련 기능을 제공하는 모듈입니다.
 */
@Module({
  controllers: [CommentController],
})
export class CommentModule {}
