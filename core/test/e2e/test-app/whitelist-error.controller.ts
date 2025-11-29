/**
 * Whitelist E2E Test Controller (error mode)
 *
 * Returns 400 error when disallowed query parameters are used.
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
    // Allowed filter fields
    allowedFilters: ['status', 'createdAt', 'title'],
    // Allowed sort fields
    allowedSorts: ['createdAt', 'updatedAt', 'title'],
    // Allowed include relationships
    allowedIncludes: ['author', 'comments'],
    // Maximum include depth
    maxIncludeDepth: 2,
    // Allowed sparse fieldsets
    allowedFields: {
      articles: ['title', 'content', 'status', 'created-at', 'updated-at'],
    },
    // Return error for disallowed parameters
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
