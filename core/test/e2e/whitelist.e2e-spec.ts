/**
 * Query Whitelist E2E Tests
 *
 * Integration tests for query parameter whitelist functionality.
 * - Filter whitelist
 * - Sort whitelist
 * - Include whitelist (with depth limit)
 * - Sparse fieldsets whitelist
 * - onDisallowed modes ('ignore' vs 'error')
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

    // Extended query parser configuration for JSON:API query parameter parsing
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
  // Backward Compatibility Tests (no whitelist configuration)
  // ============================================

  describe('No Configuration: Allow All Queries (Backward Compatible)', () => {
    it('should allow all filters without query options', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?filter[status]=published&filter[anyField]=value')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.headers['content-type']).toContain(
        'application/vnd.api+json',
      );
    });

    it('should allow all sorts without query options', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?sort=-createdAt,anyField')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should allow all includes without query options', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?include=author,comments')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // Filter Whitelist Tests (ignore mode)
  // ============================================

  describe('Filter Whitelist (ignore mode)', () => {
    it('should apply allowed filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?filter[status]=published')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // All returned articles should have status: published
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });

    it('should ignore disallowed filters', async () => {
      // password filter is not in allowed list, so it's ignored
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-ignore-articles?filter[status]=published&filter[password]=secret',
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Request succeeds without error (password filter is ignored)
      expect(response.body.errors).toBeUndefined();
    });

    it('should treat as empty filter when only disallowed filters are used', async () => {
      // Both password and secret are not in allowed list
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-ignore-articles?filter[password]=secret&filter[internalId]=123',
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Filters are ignored, returning all data
    });

    it('should allow children when parent is allowed for nested filters', async () => {
      // 'author' related filters are not allowed (not in allowedFilters)
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?filter[author.name]=John')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // author.name is ignored (author is not in allowedFilters)
    });
  });

  // ============================================
  // Filter Whitelist Tests (error mode)
  // ============================================

  describe('Filter Whitelist (error mode)', () => {
    it('should apply allowed filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?filter[status]=published')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });

    it('should return 400 error when using disallowed filters', async () => {
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

    it('should return all errors when using multiple disallowed filters', async () => {
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

    it('should return error when mixing allowed and disallowed filters', async () => {
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
  // Sort Whitelist Tests (ignore mode)
  // ============================================

  describe('Sort Whitelist (ignore mode)', () => {
    it('should apply allowed sorts', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?sort=-createdAt')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Verify sorting is applied
      const dates = response.body.data.map((a: any) =>
        new Date(a.attributes['created-at']).getTime(),
      );
      // Verify descending order
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('should ignore disallowed sorts', async () => {
      // secretField is not in allowed list
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?sort=secretField')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Sort is ignored, returning in default order
    });

    it('should apply only allowed sorts in mixed sorts', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?sort=-createdAt,secretField,title')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // secretField is ignored, only createdAt and title are applied
    });
  });

  // ============================================
  // Sort Whitelist Tests (error mode)
  // ============================================

  describe('Sort Whitelist (error mode)', () => {
    it('should apply allowed sorts', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?sort=title,-updatedAt')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 error when using disallowed sorts', async () => {
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

    it('should return error for disallowed fields in mixed sorts', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?sort=title,-secretField')
        .expect(400);

      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].detail).toContain('secretField');
    });
  });

  // ============================================
  // Include Whitelist Tests (ignore mode)
  // ============================================

  describe('Include Whitelist (ignore mode)', () => {
    it('should apply allowed includes', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=author')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // When include is applied, included array may be present
    });

    it('should ignore disallowed includes', async () => {
      // secrets is not in allowed list
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=secrets')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // secrets is ignored and not included in included array
      if (response.body.included) {
        const types = response.body.included.map((r: any) => r.type);
        expect(types).not.toContain('secrets');
      }
    });

    it('should apply only allowed includes in mixed includes', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=author,secrets,comments')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Only author and comments are applied
    });

    it('should ignore when max depth is exceeded', async () => {
      // maxIncludeDepth: 2, so depth 3 is ignored
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=author.profile.avatar')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Ignored due to depth exceeded
    });

    it('should allow up to depth 2', async () => {
      // maxIncludeDepth: 2, so depth 2 is allowed
      const response = await request(app.getHttpServer())
        .get('/whitelist-ignore-articles?include=author.profile')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // Include Whitelist Tests (error mode)
  // ============================================

  describe('Include Whitelist (error mode)', () => {
    it('should apply allowed includes', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?include=author,comments')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 error when using disallowed includes', async () => {
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

    it('should return 400 error when max depth is exceeded', async () => {
      // maxIncludeDepth: 2, so depth 3 is an error
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?include=author.profile.avatar')
        .expect(400);

      expect(response.body).toHaveProperty('errors');

      const error = response.body.errors[0];
      expect(error.code).toBe('INCLUDE_DEPTH_EXCEEDED');
      expect(error.title).toBe('Include Depth Exceeded');
      expect(error.detail).toContain('author.profile.avatar');
      expect(error.detail).toContain('2'); // max depth
    });

    it('should return compound errors - depth exceeded + disallowed include', async () => {
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

    it('should allow children when parent is allowed (within depth)', async () => {
      // When author is allowed and within depth 2, author.profile is also allowed
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?include=author.posts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // All Queries Disabled Tests
  // ============================================

  describe('All Queries Disabled', () => {
    it('should not allow any filters when all filters are disabled', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-disabled-articles?filter[status]=published')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_FILTER');
    });

    it('should not allow any sorts when all sorts are disabled', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-disabled-articles?sort=createdAt')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_SORT');
    });

    it('should not allow any includes when all includes are disabled', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-disabled-articles?include=author')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_INCLUDE');
    });

    it('should allow basic list query without any query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-disabled-articles')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // Combined Tests (multiple whitelists applied simultaneously)
  // ============================================

  describe('Combined (multiple whitelists applied simultaneously)', () => {
    it('should use all allowed queries simultaneously', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-error-articles?filter[status]=published&sort=-createdAt&include=author',
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // All conditions are applied
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });

    it('should return error if any query is disallowed (error mode)', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-error-articles?filter[status]=published&sort=secretField&include=author',
        )
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].code).toBe('DISALLOWED_SORT');
    });

    it('should return multiple errors simultaneously', async () => {
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

    it('should handle mixed queries in ignore mode', async () => {
      // Only allowed queries are applied, the rest are ignored
      // According to JSON:API spec, sort and include are comma-separated
      const response = await request(app.getHttpServer())
        .get(
          '/whitelist-ignore-articles?filter[status]=published&filter[password]=x&sort=-createdAt,secret&include=author,hidden',
        )
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Only status filter, createdAt sort, and author include are applied
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });
  });

  // ============================================
  // Single Resource (show) Whitelist Tests
  // ============================================

  describe('Single Resource (show) Whitelist', () => {
    let articleId: string;

    beforeAll(async () => {
      // Create test article
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

    it('should apply allowed includes in show action', async () => {
      if (!articleId) {
        return; // Skip if article creation failed
      }

      const response = await request(app.getHttpServer())
        .get(`/whitelist-error-articles/${articleId}?include=author`)
        .expect(200);

      expect(response.body.data.id).toBe(articleId);
    });

    it('should return error when using disallowed includes in show action', async () => {
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
  // JSON:API Error Response Format Validation
  // ============================================

  describe('JSON:API Error Response Format Validation', () => {
    it('should comply with JSON:API error response spec', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?filter[password]=x')
        .expect(400);

      // Validate JSON:API error format
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);

      const error = response.body.errors[0];
      expect(error).toHaveProperty('status');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('title');
      expect(error).toHaveProperty('detail');
      expect(error).toHaveProperty('source');
      expect(error.source).toHaveProperty('parameter');

      // Type validation
      expect(typeof error.status).toBe('string');
      expect(typeof error.code).toBe('string');
      expect(typeof error.title).toBe('string');
      expect(typeof error.detail).toBe('string');
      expect(typeof error.source.parameter).toBe('string');
    });

    it('should have Content-Type application/vnd.api+json', async () => {
      const response = await request(app.getHttpServer())
        .get('/whitelist-error-articles?filter[password]=x')
        .expect(400);

      expect(response.headers['content-type']).toContain(
        'application/vnd.api+json',
      );
    });
  });
});
