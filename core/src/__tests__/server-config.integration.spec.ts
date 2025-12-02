/**
 * Server Config API 통합 테스트
 *
 * 실제 HTTP 요청을 통해 Server Config API의 동작을 검증합니다.
 *
 * @packageDocumentation
 * @module __tests__
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Module, Inject } from '@nestjs/common';
import request from 'supertest';
import { Response } from 'supertest';
import { JsonApiModule } from '../json-api.module';
import { JsonApiController } from '../decorators/json-api-controller.decorator';
import { JsonApiCrudController } from '../controllers/json-api-crud.controller';
import { PrismaAdapterService } from '../services/prisma-adapter.service';
import { JsonApiQueryService } from '../services/json-api-query.service';
import { JsonApiSerializerService } from '../services/json-api-serializer.service';
import { JsonApiModuleOptions } from '../interfaces';
import { JSON_API_MODULE_OPTIONS } from '../constants';

// ========== Mock 컨트롤러 및 시리얼라이저 설정 ==========

/**
 * 테스트용 Mock 시리얼라이저
 */
class MockArticleSerializer {
  serialize(data: any) {
    return data;
  }
}

/**
 * 테스트용 Mock Prisma 서비스
 */
class MockPrismaService {
  article = {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
  };
}

/**
 * 테스트용 Mock 컨트롤러
 *
 * @Controller()와 @JsonApiController() 모두 필요
 * JsonApiCrudController를 extend하여 Server Config API가 메타데이터를 수집할 수 있도록 함
 */
@Controller('articles')
@JsonApiController({
  model: 'article',
  serializer: MockArticleSerializer,
  type: 'articles',
  only: ['index', 'show', 'create', 'update', 'delete'],
  relationships: {
    author: { type: 'users', many: false },
    comments: { type: 'comments', many: true },
  },
  query: {
    allowedFilters: ['status', 'authorId'],
    allowedSorts: ['createdAt', 'title'],
    allowedIncludes: ['author', 'comments'],
    maxIncludeDepth: 2,
  },
})
class MockArticleController extends JsonApiCrudController {
  constructor(
    private readonly _prismaAdapter: PrismaAdapterService,
    private readonly _queryService: JsonApiQueryService,
    private readonly _serializerService: JsonApiSerializerService,
    @Inject(JSON_API_MODULE_OPTIONS)
    private readonly _moduleOptions: JsonApiModuleOptions,
  ) {
    super();
  }

  protected get prismaAdapter(): PrismaAdapterService {
    return this._prismaAdapter;
  }
  protected get queryService(): JsonApiQueryService {
    return this._queryService;
  }
  protected get serializerService(): JsonApiSerializerService {
    return this._serializerService;
  }
  protected get moduleOptions(): JsonApiModuleOptions {
    return this._moduleOptions;
  }
}

/**
 * Mock 컨트롤러를 포함하는 테스트 모듈
 */
@Module({
  controllers: [MockArticleController],
})
class MockControllersModule {}

describe('ServerConfig Integration', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  /**
   * 테스트 앱 생성 헬퍼
   */
  const createApp = async (config: {
    enabled: boolean;
    password?: string;
    path?: string;
    includeMockControllers?: boolean;
  }) => {
    const imports: any[] = [
      JsonApiModule.forRoot({
        pagination: { defaultLimit: 20, maxLimit: 100 },
        serverConfig: config.enabled
          ? { enabled: true, password: config.password!, path: config.path }
          : { enabled: false },
      }),
    ];

    // Mock 컨트롤러가 필요한 테스트에서만 포함
    if (config.includeMockControllers) {
      imports.push(MockControllersModule);
    }

    moduleRef = await Test.createTestingModule({
      imports,
    })
      .overrideProvider('PRISMA_SERVICE')
      .useClass(MockPrismaService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    return app;
  };

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('비활성화 상태', () => {
    /**
     * forRoot에서 enabled=false일 때 ServerConfigModule이 등록되지 않아 404 반환
     * (forRootAsync에서는 항상 등록되어 Guard에서 403 반환)
     */
    it('forRoot에서 비활성화 시 404 반환 (ServerConfigModule 미등록)', async () => {
      await createApp({ enabled: false });

      return request(app.getHttpServer()).get('/server-config').expect(404);
    });
  });

  describe('인증 검증', () => {
    it('Authorization 헤더 누락 시 401 반환', async () => {
      await createApp({ enabled: true, password: 'test-password' });

      return request(app.getHttpServer()).get('/server-config').expect(401);
    });

    it('잘못된 비밀번호 시 401 반환', async () => {
      await createApp({ enabled: true, password: 'test-password' });

      return request(app.getHttpServer())
        .get('/server-config')
        .set('Authorization', 'Bearer wrong-password')
        .expect(401);
    });

    it('Bearer 형식이 아닌 헤더 시 401 반환', async () => {
      await createApp({ enabled: true, password: 'test-password' });

      return request(app.getHttpServer())
        .get('/server-config')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(401);
    });
  });

  describe('GET /server-config', () => {
    it('인증 성공 시 전체 리소스 목록 반환', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.version).toBe('1.0.0');
          expect(res.body.global).toBeDefined();
          expect(res.body.global.idType).toBe('string');
          expect(res.body.global.pagination).toBeDefined();
          expect(res.body.global.pagination.defaultLimit).toBe(20);
          expect(res.body.global.pagination.maxLimit).toBe(100);
          expect(res.body.resources).toBeInstanceOf(Array);
          // Mock 컨트롤러가 등록되어 있으면 리소스가 있어야 함
          expect(res.body.resources.length).toBeGreaterThan(0);
        });
    });

    it('리소스 상세 정보 확인', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          const articleResource = res.body.resources.find(
            (r: any) => r.model === 'article',
          );
          expect(articleResource).toBeDefined();
          expect(articleResource.type).toBe('articles');
          expect(articleResource.enabledActions).toContain('index');
          expect(articleResource.enabledActions).toContain('show');
          expect(articleResource.query).toBeDefined();
          expect(articleResource.query.allowedFilters).toEqual([
            'status',
            'authorId',
          ]);
        });
    });

    it('Mock 컨트롤러 없을 때 빈 리소스 배열', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: false,
      });

      return request(app.getHttpServer())
        .get('/server-config')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.resources).toEqual([]);
        });
    });
  });

  describe('GET /server-config/:model', () => {
    it('존재하지 않는 모델 조회 시 404 반환', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config/nonexistent')
        .set('Authorization', 'Bearer test-password')
        .expect(404);
    });

    it('특정 모델 상세 정보 반환', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config/article')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.model).toBe('article');
          expect(res.body.type).toBe('articles');
          expect(res.body.enabledActions).toContain('index');
          expect(res.body.enabledActions).toContain('show');
          expect(res.body.enabledActions).toContain('create');
          expect(res.body.enabledActions).toContain('update');
          expect(res.body.enabledActions).toContain('delete');
        });
    });

    it('관계 정보 확인', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config/article')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.relationships).toBeDefined();
          expect(res.body.relationships.author.type).toBe('users');
          expect(res.body.relationships.author.cardinality).toBe('one');
          expect(res.body.relationships.comments.type).toBe('comments');
          expect(res.body.relationships.comments.cardinality).toBe('many');
        });
    });

    it('쿼리 설정 확인', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config/article')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.query).toBeDefined();
          expect(res.body.query.allowedFilters).toEqual(['status', 'authorId']);
          expect(res.body.query.allowedSorts).toEqual(['createdAt', 'title']);
          expect(res.body.query.allowedIncludes).toEqual([
            'author',
            'comments',
          ]);
          expect(res.body.query.maxIncludeDepth).toBe(2);
        });
    });

    it('인증 없이 특정 모델 조회 시 401 반환', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config/article')
        .expect(401);
    });
  });

  describe('커스텀 경로', () => {
    it('serverConfig.path로 설정한 경로에서 응답', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        path: 'api-meta',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/api-meta')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.version).toBe('1.0.0');
          expect(res.body.resources).toBeInstanceOf(Array);
        });
    });

    it('커스텀 경로 설정 시 기본 경로는 404', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        path: 'api-meta',
      });

      return request(app.getHttpServer())
        .get('/server-config')
        .set('Authorization', 'Bearer test-password')
        .expect(404);
    });

    it('커스텀 경로로 특정 모델 조회', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        path: 'api-meta',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/api-meta/article')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.model).toBe('article');
          expect(res.body.type).toBe('articles');
        });
    });

    it('슬래시가 포함된 커스텀 경로', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        path: 'api/v1/meta',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/api/v1/meta')
        .set('Authorization', 'Bearer test-password')
        .expect(200);
    });
  });

  describe('응답 형식', () => {
    it('응답이 JSON:API 형식이 아님 (의도적)', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          // JSON:API 형식이 아니므로 data 래퍼 없음
          expect(res.body.data).toBeUndefined();
          // 직접적인 구조
          expect(res.body.version).toBeDefined();
          expect(res.body.global).toBeDefined();
          expect(res.body.resources).toBeDefined();
        });
    });

    it('Content-Type이 JSON:API (인터셉터에 의해 변환)', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect('Content-Type', /application\/vnd\.api\+json/);
    });
  });

  describe('pagination 설정', () => {
    it('기본 pagination 값 확인', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config/article')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.pagination).toBeDefined();
          expect(res.body.pagination.defaultLimit).toBe(20);
          expect(res.body.pagination.maxLimit).toBe(100);
        });
    });
  });

  describe('idType 설정', () => {
    it('기본 idType은 string', async () => {
      await createApp({
        enabled: true,
        password: 'test-password',
        includeMockControllers: true,
      });

      return request(app.getHttpServer())
        .get('/server-config/article')
        .set('Authorization', 'Bearer test-password')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.idType).toBe('string');
        });
    });
  });
});
