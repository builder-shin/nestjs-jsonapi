import { JsonApiSerializer, Attribute, Relationship } from '../../../src';
// 순환 참조 방지: type-only import 사용
import type { AuthorSerializer } from './author.serializer';
import type { CommentSerializer } from './comment.serializer';

@JsonApiSerializer({ type: 'articles' })
export class ArticleSerializer {
  @Attribute()
  title: string;

  @Attribute()
  content: string;

  @Attribute()
  status: string;

  @Attribute({ name: 'created-at' })
  createdAt: Date;

  @Attribute({ name: 'updated-at' })
  updatedAt: Date;

  /**
   * 순환 참조 관계: ArticleSerializer ↔ AuthorSerializer
   * 팩토리 함수 () => AuthorSerializer로 지연 평가하여 순환 참조 해결
   */
  @Relationship(() => require('./author.serializer').AuthorSerializer, {
    type: 'hasOne',
  })
  author: AuthorSerializer;

  @Relationship(() => require('./comment.serializer').CommentSerializer, {
    type: 'hasMany',
  })
  comments: CommentSerializer[];
}
