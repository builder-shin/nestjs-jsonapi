import { Controller } from '@nestjs/common';
import {
  JsonApiCrudController,
  JsonApiController,
  BeforeAction,
} from '../../../src';
import { PrismaAdapterService } from '../../../src/services/prisma-adapter.service';
import { JsonApiQueryService } from '../../../src/services/json-api-query.service';
import { JsonApiSerializerService } from '../../../src/services/json-api-serializer.service';
import { ArticleSerializer } from './article.serializer';
import { CreateArticleDto, UpdateArticleDto } from './article.dto';

@Controller('articles')
@JsonApiController({
  model: 'article',
  serializer: ArticleSerializer,
  dto: {
    create: CreateArticleDto,
    update: UpdateArticleDto,
  },
})
@BeforeAction('authenticate', { except: ['index', 'show'] })
export class ArticleController extends JsonApiCrudController {
  constructor(
    private readonly _prismaAdapter: PrismaAdapterService,
    private readonly _queryService: JsonApiQueryService,
    private readonly _serializerService: JsonApiSerializerService,
  ) {
    super();
  }

  // abstract getter 구현
  protected get prismaAdapter() {
    return this._prismaAdapter;
  }
  protected get queryService() {
    return this._queryService;
  }
  protected get serializerService() {
    return this._serializerService;
  }

  /**
   * 인증 훅 - 실제 구현에서는 JWT 또는 세션 검증
   */
  protected async authenticate(): Promise<void> {
    // 테스트에서는 항상 통과
  }
}
