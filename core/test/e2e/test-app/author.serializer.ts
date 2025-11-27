import { JsonApiSerializer, Attribute, Relationship } from '../../../src';
// 순환 참조 방지: type-only import 사용
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
   * 순환 참조 관계: AuthorSerializer ↔ ArticleSerializer
   * require()로 지연 로딩하여 순환 참조 해결
   */
  @Relationship(() => require('./article.serializer').ArticleSerializer, {
    type: 'hasMany',
  })
  articles: ArticleSerializer[];
}
