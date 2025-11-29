import { JsonApiSerializer, Attribute, Relationship } from "@builder-shin/nestjs-jsonapi";
import { UserSerializer } from "../users/user.serializer";

/**
 * ArticleSerializer
 *
 * Serializes the Article model to JSON:API format.
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

  // Relationship definitions
  @Relationship(() => UserSerializer)
  author: unknown;

  // Use lazy import to prevent circular reference
  @Relationship(() => require("../comments/comment.serializer").CommentSerializer)
  comments: unknown[];
}
