import { JsonApiSerializer, Attribute, Relationship } from '../../../src';
// Use type-only import to prevent circular reference
import type { AuthorSerializer } from './author.serializer';
import type { CommentSerializer } from './comment.serializer';

@JsonApiSerializer({ type: 'articles' })
export class ArticleSerializer {
  @Attribute()
  title!: string;

  @Attribute()
  content!: string;

  @Attribute()
  status!: string;

  @Attribute({ name: 'created-at' })
  createdAt!: Date;

  @Attribute({ name: 'updated-at' })
  updatedAt!: Date;

  /**
   * Circular reference relationship: ArticleSerializer ↔ AuthorSerializer
   * Resolves circular reference by using factory function () => AuthorSerializer for lazy evaluation
   */
  @Relationship(() => require('./author.serializer').AuthorSerializer, {
    type: 'hasOne',
  })
  author!: AuthorSerializer;

  @Relationship(() => require('./comment.serializer').CommentSerializer, {
    type: 'hasMany',
  })
  comments!: CommentSerializer[];
}
