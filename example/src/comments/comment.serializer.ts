import { JsonApiSerializer, Attribute, Relationship } from "@builder-shin/nestjs-jsonapi";
import { UserSerializer } from "../users/user.serializer";
import { ArticleSerializer } from "../articles/article.serializer";

/**
 * CommentSerializer
 *
 * Comment 모델을 JSON:API 형식으로 직렬화합니다.
 */
@JsonApiSerializer("comments")
export class CommentSerializer {
  @Attribute()
  body: string;

  @Attribute()
  createdAt: Date;

  @Attribute()
  updatedAt: Date;

  // 관계 정의
  @Relationship(() => UserSerializer)
  author: unknown;

  @Relationship(() => ArticleSerializer)
  article: unknown;
}
