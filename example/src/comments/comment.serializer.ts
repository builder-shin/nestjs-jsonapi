import { JsonApiSerializer, Attribute, Relationship } from "@builder-shin/nestjs-jsonapi";
import { UserSerializer } from "../users/user.serializer";
import { ArticleSerializer } from "../articles/article.serializer";

/**
 * CommentSerializer
 *
 * Serializes the Comment model to JSON:API format.
 */
@JsonApiSerializer({ type: "comments" })
export class CommentSerializer {
  @Attribute()
  body: string;

  @Attribute()
  createdAt: Date;

  @Attribute()
  updatedAt: Date;

  // Relationship definitions
  @Relationship(() => UserSerializer)
  author: unknown;

  @Relationship(() => ArticleSerializer)
  article: unknown;
}
