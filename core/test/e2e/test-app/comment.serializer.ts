import { JsonApiSerializer, Attribute, Relationship } from '../../../src';
// 순환 참조 방지: type-only import 사용
import type { ArticleSerializer } from './article.serializer';
import type { AuthorSerializer } from './author.serializer';

@JsonApiSerializer({ type: 'comments' })
export class CommentSerializer {
  @Attribute()
  body: string;

  @Attribute({ name: 'created-at' })
  createdAt: Date;

  // CommentSerializer는 순환 참조에 포함되지 않으므로 require() 불필요
  // 단, 일관성을 위해 동일 패턴 적용 가능
  @Relationship(() => require('./article.serializer').ArticleSerializer, {
    type: 'hasOne',
  })
  article: ArticleSerializer;

  @Relationship(() => require('./author.serializer').AuthorSerializer, {
    type: 'hasOne',
  })
  author: AuthorSerializer;
}
