import { JsonApiSerializer, Attribute, Relationship } from '../../../src';
// Use type-only import to prevent circular reference
import type { ArticleSerializer } from './article.serializer';
import type { AuthorSerializer } from './author.serializer';

@JsonApiSerializer({ type: 'comments' })
export class CommentSerializer {
  @Attribute()
  body: string;

  @Attribute({ name: 'created-at' })
  createdAt: Date;

  // CommentSerializer is not part of the circular reference, so require() is not necessary
  // However, the same pattern can be applied for consistency
  @Relationship(() => require('./article.serializer').ArticleSerializer, {
    type: 'hasOne',
  })
  article: ArticleSerializer;

  @Relationship(() => require('./author.serializer').AuthorSerializer, {
    type: 'hasOne',
  })
  author: AuthorSerializer;
}
