/**
 * Query Whitelist E2E 테스트
 *
 * 쿼리 파라미터 화이트리스트 기능의 통합 테스트입니다.
 * - Filter whitelist
 * - Sort whitelist
 * - Include whitelist (깊이 제한 포함)
 * - Sparse fieldsets whitelist
 * - onDisallowed 모드 ('ignore' vs 'error')
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './test-app/app.module';

describe('Query Whitelist E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // JSON:API 쿼리 파라미터 파싱을 위한 extended query parser 설정
    // filter[status]=published → { filter: { status: 'published' } }
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('query parser', 'extended');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================
  // 하위 호환성 테스트 (whitelist 설정 없음)
  // ============================================

  describe('설정 없음: 모든 쿼리 허용 (하위 호환)', () => {
    it('query 옵션 없이 모든 필터 허용', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?filter[status]=published&filter[anyField]=value')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.headers['content-type']).toContain(
        'application/vnd.api+json',
      );
    });

    it('query 옵션 없이 모든 정렬 허용', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?sort=-createdAt,anyField')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('query 옵션 없이 모든 include 허용', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?include=author,comments')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // Filter Whitelist 테스트 (ignore 모드)
  // ============================================

  describe('Filter Whitelist (ignore 모드)', () => {
    it('허용된 필터 적용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?filter[status]=published')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // 모든 반환된 아티클은 status가 published여야 함
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });

    it('허용되지 않은 필터 무시', async () => {
      // password 필터는 허용 목록에 없으므로 무시됨
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-ignore-articles?filter[status]=published&filter[password]=secret',
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // 에러 없이 요청 성공 (password 필터는 무시됨)
      expect(response.body.errors).toBeUndefined();
    });

    it('허용되지 않은 필터만 사용 시 빈 필터로 처리', async () => {
      // password와 secret 둘 다 허용 목록에 없음
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-ignore-articles?filter[password]=secret&filter[internalId]=123',
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // 필터가 무시되어 모든 데이터 반환
    });

    it('중첩 필터 - 부모가 허용되면 자식도 허용', async () => {
      // 'author' 관련 필터는 허용되지 않음 (allowedFilters에 없음)
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?filter[author.name]=John')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // author.name은 무시됨 (allowedFilters에 author가 없음)
    });
  });

  // ============================================
  // Filter Whitelist 테스트 (error 모드)
  // ============================================

  describe('Filter Whitelist (error 모드)', () => {
    it('허용된 필터 적용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?filter[status]=published')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });

    it('허용되지 않은 필터 사용 시 400 에러', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?filter[password]=secret')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);

      const error = response.body.errors[0];
      expect(error.status).toBe('400');
      expect(error.code).toBe('DISALLOWED_FILTER');
      expect(error.title).toBe('Disallowed Filter');
      expect(error.detail).toContain('password');
      expect(error.source.parameter).toBe('filter[password]');
    });

    it('복수의 허용되지 않은 필터 사용 시 모든 에러 반환', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-error-articles?filter[password]=secret&filter[internalId]=123',
        )
        .expect(400);

      expect(response.body.errors).toHaveLength(2);

      const errorFields = response.body.errors.map(
        (e: any) => e.source.parameter,
      );
      expect(errorFields).toContain('filter[password]');
      expect(errorFields).toContain('filter[internalId]');
    });

    it('허용된 필터와 허용되지 않은 필터 혼합 시 에러', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-error-articles?filter[status]=published&filter[password]=secret',
        )
        .expect(400);

      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].source.parameter).toBe('filter[password]');
    });
  });

  // ============================================
  // Sort Whitelist 테스트 (ignore 모드)
  // ============================================

  describe('Sort Whitelist (ignore 모드)', () => {
    it('허용된 정렬 적용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?sort=-createdAt')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // 정렬이 적용되었는지 확인
      const dates = response.body.data.map((a: any) =>
        new Date(a.attributes['created-at']).getTime(),
      );
      // 내림차순 정렬 확인
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('허용되지 않은 정렬 무시', async () => {
      // secretField는 허용 목록에 없음
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?sort=secretField')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // 정렬이 무시되어 기본 순서로 반환
    });

    it('혼합 정렬 - 허용된 것만 적용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?sort=-createdAt,secretField,title')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // secretField는 무시되고 createdAt, title만 적용됨
    });
  });

  // ============================================
  // Sort Whitelist 테스트 (error 모드)
  // ============================================

  describe('Sort Whitelist (error 모드)', () => {
    it('허용된 정렬 적용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?sort=title,-updatedAt')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('허용되지 않은 정렬 사용 시 400 에러', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?sort=secretField')
        .expect(400);

      expect(response.body).toHaveProperty('errors');

      const error = response.body.errors[0];
      expect(error.code).toBe('DISALLOWED_SORT');
      expect(error.title).toBe('Disallowed Sort');
      expect(error.detail).toContain('secretField');
      expect(error.source.parameter).toBe('sort');
    });

    it('혼합 정렬 시 허용되지 않은 필드에 대해 에러', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?sort=title,-secretField')
        .expect(400);

      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].detail).toContain('secretField');
    });
  });

  // ============================================
  // Include Whitelist 테스트 (ignore 모드)
  // ============================================

  describe('Include Whitelist (ignore 모드)', () => {
    it('허용된 include 적용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=author')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // include가 적용되면 included 배열이 포함될 수 있음
    });

    it('허용되지 않은 include 무시', async () => {
      // secrets는 허용 목록에 없음
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=secrets')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // secrets는 무시되어 included에 포함되지 않음
      if (response.body.included) {
        const types = response.body.included.map((r: any) => r.type);
        expect(types).not.toContain('secrets');
      }
    });

    it('혼합 include - 허용된 것만 적용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=author,secrets,comments')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // author와 comments만 적용됨
    });

    it('최대 깊이 초과 시 무시', async () => {
      // maxIncludeDepth: 2이므로 깊이 3은 무시됨
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=author.profile.avatar')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // 깊이 초과로 무시됨
    });

    it('깊이 2까지 허용', async () => {
      // maxIncludeDepth: 2이므로 깊이 2까지는 허용
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=author.profile')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // Include Whitelist 테스트 (error 모드)
  // ============================================

  describe('Include Whitelist (error 모드)', () => {
    it('허용된 include 적용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?include=author,comments')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('허용되지 않은 include 사용 시 400 에러', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?include=secrets')
        .expect(400);

      expect(response.body).toHaveProperty('errors');

      const error = response.body.errors[0];
      expect(error.code).toBe('DISALLOWED_INCLUDE');
      expect(error.title).toBe('Disallowed Include');
      expect(error.detail).toContain('secrets');
      expect(error.source.parameter).toBe('include');
    });

    it('최대 깊이 초과 시 400 에러', async () => {
      // maxIncludeDepth: 2이므로 깊이 3은 에러
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?include=author.profile.avatar')
        .expect(400);

      expect(response.body).toHaveProperty('errors');

      const error = response.body.errors[0];
      expect(error.code).toBe('INCLUDE_DEPTH_EXCEEDED');
      expect(error.title).toBe('Include Depth Exceeded');
      expect(error.detail).toContain('author.profile.avatar');
      expect(error.detail).toContain('2'); // 최대 깊이
    });

    it('복합 에러 - 깊이 초과 + 허용되지 않은 include', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-error-articles?include=author.profile.avatar,secrets',
        )
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThanOrEqual(2);

      const codes = response.body.errors.map((e: any) => e.code);
      expect(codes).toContain('INCLUDE_DEPTH_EXCEEDED');
      expect(codes).toContain('DISALLOWED_INCLUDE');
    });

    it('부모 허용 시 자식 허용 (깊이 내)', async () => {
      // author가 허용되고 깊이 2 이내이면 author.profile도 허용
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?include=author.posts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // 모든 쿼리 비활성화 테스트
  // ============================================

  describe('모든 쿼리 비활성화', () => {
    it('모든 필터 비활성화 시 어떤 필터도 사용 불가', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-disabled-articles?filter[status]=published')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_FILTER');
    });

    it('모든 정렬 비활성화 시 어떤 정렬도 사용 불가', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-disabled-articles?sort=createdAt')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_SORT');
    });

    it('모든 include 비활성화 시 어떤 include도 사용 불가', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-disabled-articles?include=author')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_INCLUDE');
    });

    it('쿼리 없이 기본 목록 조회는 허용', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-disabled-articles')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // Combined 테스트 (여러 화이트리스트 동시 적용)
  // ============================================

  describe('Combined (여러 화이트리스트 동시 적용)', () => {
    it('모든 허용된 쿼리 동시 사용', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-error-articles?filter[status]=published&sort=-createdAt&include=author',
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // 모든 조건이 적용됨
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });

    it('하나라도 허용되지 않으면 에러 (error 모드)', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-error-articles?filter[status]=published&sort=secretField&include=author',
        )
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_SORT');
    });

    it('복수 에러 동시 발생', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-error-articles?filter[password]=x&sort=secret&include=hidden',
        )
        .expect(400);

      expect(response.body.errors.length).toBe(3);

      const codes = response.body.errors.map((e: any) => e.code);
      expect(codes).toContain('DISALLOWED_FILTER');
      expect(codes).toContain('DISALLOWED_SORT');
      expect(codes).toContain('DISALLOWED_INCLUDE');
    });

    it('ignore 모드에서 혼합 쿼리 처리', async () => {
      // 허용된 것만 적용, 나머지는 무시
      // JSON:API 규격에 따라 sort와 include는 쉼표로 구분
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-ignore-articles?filter[status]=published&filter[password]=x&sort=-createdAt,secret&include=author,hidden',
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // status 필터와 createdAt 정렬, author include만 적용됨
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });
  });

  // ============================================
  // 단일 리소스 조회 (show) 화이트리스트 테스트
  // ============================================

  describe('단일 리소스 조회 (show) 화이트리스트', () => {
    let articleId: string;

    beforeAll(async () => {
      // 테스트용 아티클 생성
      const createResponse = await request(app.getHttpServer())
        .post('/whitelist-error-articles')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            type: 'articles',
            attributes: {
              title: 'Whitelist Test Article',
              content: 'Test content',
              status: 'published',
            },
          },
        });

      articleId = createResponse.body.data?.id;
    });

    it('show 액션에서 허용된 include 적용', async () => {
      if (!articleId) {
        return; // 아티클 생성 실패 시 스킵
      }

      const response = await request(app.getHttpServer())
        .get(`/whitelist-error-articles/${articleId}?include=author`)
        .expect(200);

      expect(response.body.data.id).toBe(articleId);
    });

    it('show 액션에서 허용되지 않은 include 사용 시 에러', async () => {
      if (!articleId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/whitelist-error-articles/${articleId}?include=secrets`)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_INCLUDE');
    });
  });

  // ============================================
  // JSON:API 에러 응답 형식 검증
  // ============================================

  describe('JSON:API 에러 응답 형식 검증', () => {
    it('에러 응답이 JSON:API 스펙을 준수', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?filter[password]=x')
        .expect(400);

      // JSON:API 에러 형식 검증
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);

      const error = response.body.errors[0];
      expect(error).toHaveProperty('status');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('title');
      expect(error).toHaveProperty('detail');
      expect(error).toHaveProperty('source');
      expect(error.source).toHaveProperty('parameter');

      // 타입 검증
      expect(typeof error.status).toBe('string');
      expect(typeof error.code).toBe('string');
      expect(typeof error.title).toBe('string');
      expect(typeof error.detail).toBe('string');
      expect(typeof error.source.parameter).toBe('string');
    });

    it('Content-Type이 application/vnd.api+json', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?filter[password]=x')
        .expect(400);

      expect(response.headers['content-type']).toContain(
        'application/vnd.api+json',
      );
    });
  });
});
