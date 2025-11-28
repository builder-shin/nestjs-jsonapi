/**
 * Whitelist E2E 테스트용 컨트롤러 (error 모드)
 *
 * 허용되지 않은 쿼리 파라미터 사용 시 400 에러를 반환합니다.
 */
import { Controller } from '@nestjs/common';
import {
  JsonApiCrudController,
  JsonApiController,
} from '../../../src';
import { PrismaAdapterService } from '../../../src/services/prisma-adapter.service';
import { JsonApiQueryService } from '../../../src/services/json-api-query.service';
import { JsonApiSerializerService } from '../../../src/services/json-api-serializer.service';
import { ArticleSerializer } from './article.serializer';
import { CreateArticleDto, UpdateArticleDto } from './article.dto';

@Controller('whitelist-error-articles')
@JsonApiController({
  model: 'article',
  serializer: ArticleSerializer,
  dto: {
    create: CreateArticleDto,
    update: UpdateArticleDto,
  },
  query: {
    // 허용된 필터 필드
    allowedFilters: ['status', 'createdAt', 'title'],
    // 허용된 정렬 필드
    allowedSorts: ['createdAt', 'updatedAt', 'title'],
    // 허용된 include 관계
    allowedIncludes: ['author', 'comments'],
    // include 최대 깊이
    maxIncludeDepth: 2,
    // 허용된 sparse fieldsets
    allowedFields: {
      articles: ['title', 'content', 'status', 'created-at', 'updated-at'],
    },
    // 허용되지 않은 파라미터에 대해 에러 반환
    onDisallowed: 'error',
  },
})
export class WhitelistErrorArticleController extends JsonApiCrudController {
  constructor(
    private readonly _prismaAdapter: PrismaAdapterService,
    private readonly _queryService: JsonApiQueryService,
    private readonly _serializerService: JsonApiSerializerService,
  ) {
    super();
  }

  protected get prismaAdapter() {
    return this._prismaAdapter;
  }
  protected get queryService() {
    return this._queryService;
  }
  protected get serializerService() {
    return this._serializerService;
  }
}
