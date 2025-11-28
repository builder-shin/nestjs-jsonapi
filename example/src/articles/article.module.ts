import { Module } from "@nestjs/common";
import { ArticleController } from "./article.controller";

/**
 * ArticleModule
 *
 * 게시글 관련 기능을 제공하는 모듈입니다.
 */
@Module({
  controllers: [ArticleController],
})
export class ArticleModule {}
