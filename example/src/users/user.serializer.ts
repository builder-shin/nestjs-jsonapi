import { JsonApiSerializer, Attribute, Relationship } from "@builder-shin/nestjs-jsonapi";

/**
 * UserSerializer
 *
 * User 모델을 JSON:API 형식으로 직렬화합니다.
 */
@JsonApiSerializer({ type: "users" })
export class UserSerializer {
  @Attribute()
  email: string;

  @Attribute()
  name: string;

  @Attribute()
  role: string;

  @Attribute()
  createdAt: Date;

  @Attribute()
  updatedAt: Date;

  // 순환 참조 방지를 위해 lazy import 사용
  @Relationship(() => require("../articles/article.serializer").ArticleSerializer)
  articles: unknown[];

  @Relationship(() => require("../comments/comment.serializer").CommentSerializer)
  comments: unknown[];
}
