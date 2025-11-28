import { JsonApiSerializer, Attribute, Relationship } from "@builder-shin/nestjs-jsonapi";
import { UserSerializer } from "../users/user.serializer";

/**
 * ArticleSerializer
 *
 * Article 모델을 JSON:API 형식으로 직렬화합니다.
 */
@JsonApiSerializer({ type: "articles" })
export class ArticleSerializer {
  @Attribute()
  title: string;

  @Attribute()
  content: string;

  @Attribute()
  status: string;

  @Attribute()
  publishedAt: Date | null;

  @Attribute()
  createdAt: Date;

  @Attribute()
  updatedAt: Date;

  // 관계 정의
  @Relationship(() => UserSerializer)
  author: unknown;

  // 순환 참조 방지를 위해 lazy import 사용
  @Relationship(() => require("../comments/comment.serializer").CommentSerializer)
  comments: unknown[];
}
