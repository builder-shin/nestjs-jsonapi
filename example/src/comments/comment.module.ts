import { Module } from "@nestjs/common";
import { CommentController } from "./comment.controller";

/**
 * CommentModule
 *
 * Module that provides comment-related functionality.
 */
@Module({
  controllers: [CommentController],
})
export class CommentModule {}
