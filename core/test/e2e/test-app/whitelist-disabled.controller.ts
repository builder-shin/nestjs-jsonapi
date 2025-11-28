/**
 * Whitelist E2E 테스트용 컨트롤러 (모든 쿼리 비활성화)
 *
 * 모든 필터, 정렬, include를 비활성화합니다.
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

@Controller('whitelist-disabled-articles')
@JsonApiController({
  model: 'article',
  serializer: ArticleSerializer,
  dto: {
    create: CreateArticleDto,
    update: UpdateArticleDto,
  },
  query: {
    // 빈 배열: 모든 필터 비활성화
    allowedFilters: [],
    // 빈 배열: 모든 정렬 비활성화
    allowedSorts: [],
    // 빈 배열: 모든 include 비활성화
    allowedIncludes: [],
    // 에러 모드로 설정하여 비활성화 검증
    onDisallowed: 'error',
  },
})
export class WhitelistDisabledArticleController extends JsonApiCrudController {
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
