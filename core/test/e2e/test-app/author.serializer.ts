import { JsonApiSerializer, Attribute, Relationship } from '../../../src';
// Use type-only import to prevent circular reference
import type { ArticleSerializer } from './article.serializer';

@JsonApiSerializer({ type: 'authors' })
export class AuthorSerializer {
  @Attribute()
  name: string;

  @Attribute()
  email: string;

  @Attribute({ name: 'created-at' })
  createdAt: Date;

  /**
   * Circular reference relationship: AuthorSerializer ↔ ArticleSerializer
   * Resolves circular reference by lazy loading with require()
   */
  @Relationship(() => require('./article.serializer').ArticleSerializer, {
    type: 'hasMany',
  })
  articles: ArticleSerializer[];
}
