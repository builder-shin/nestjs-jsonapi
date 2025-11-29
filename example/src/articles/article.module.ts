import { Module } from "@nestjs/common";
import { ArticleController } from "./article.controller";

/**
 * ArticleModule
 *
 * Module that provides article-related functionality.
 */
@Module({
  controllers: [ArticleController],
})
export class ArticleModule {}
