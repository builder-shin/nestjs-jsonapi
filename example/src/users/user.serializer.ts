import { JsonApiSerializer, Attribute, Relationship } from "@builder-shin/nestjs-jsonapi";

/**
 * UserSerializer
 *
 * Serializes the User model to JSON:API format.
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

  // Use lazy import to prevent circular reference
  @Relationship(() => require("../articles/article.serializer").ArticleSerializer)
  articles: unknown[];

  @Relationship(() => require("../comments/comment.serializer").CommentSerializer)
  comments: unknown[];
}
