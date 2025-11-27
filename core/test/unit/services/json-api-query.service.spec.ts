import { Test, TestingModule } from '@nestjs/testing';
import { JsonApiQueryService } from '../../../src/services/json-api-query.service';
import { JSON_API_MODULE_OPTIONS } from '../../../src/constants';

describe('JsonApiQueryService', () => {
  let service: JsonApiQueryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JsonApiQueryService,
        {
          provide: JSON_API_MODULE_OPTIONS,
          useValue: {
            pagination: {
              defaultLimit: 20,
              maxLimit: 100,
            },
          },
        },
      ],
    }).compile();

    service = module.get<JsonApiQueryService>(JsonApiQueryService);
  });

  describe('parse', () => {
    it('should parse empty query', () => {
      const request = { query: {} } as any;
      const result = service.parse(request);

      expect(result).toEqual({
        filter: [],
        sort: [],
        page: { offset: 0, limit: 20 },
        include: [],
        fields: {},
      });
    });

    it('should parse filter with eq operator', () => {
      const request = {
        query: {
          filter: { status: 'published' },
        },
      } as any;
      const result = service.parse(request);

      expect(result.filter).toEqual([
        { field: 'status', operator: 'eq', value: 'published' },
      ]);
    });

    it('should parse filter with explicit operator', () => {
      const request = {
        query: {
          filter: { age: { gte: '18' } },
        },
      } as any;
      const result = service.parse(request);

      expect(result.filter).toEqual([
        { field: 'age', operator: 'gte', value: 18 },
      ]);
    });

    it('should parse filter with in operator', () => {
      const request = {
        query: {
          filter: { role: { in: 'admin,user' } },
        },
      } as any;
      const result = service.parse(request);

      expect(result.filter).toEqual([
        { field: 'role', operator: 'in', value: ['admin', 'user'] },
      ]);
    });

    it('should parse sort parameter', () => {
      const request = {
        query: { sort: '-createdAt,title' },
      } as any;
      const result = service.parse(request);

      expect(result.sort).toEqual([
        { field: 'createdAt', order: 'desc' },
        { field: 'title', order: 'asc' },
      ]);
    });

    it('should parse page parameter', () => {
      const request = {
        query: { page: { offset: '20', limit: '10' } },
      } as any;
      const result = service.parse(request);

      expect(result.page).toEqual({ offset: 20, limit: 10 });
    });

    it('should respect maxLimit', () => {
      const request = {
        query: { page: { limit: '200' } },
      } as any;
      const result = service.parse(request);

      expect(result.page.limit).toBe(100);
    });

    it('should parse include parameter', () => {
      const request = {
        query: { include: 'comments,author.profile' },
      } as any;
      const result = service.parse(request);

      expect(result.include).toEqual(['comments', 'author.profile']);
    });

    it('should parse fields parameter', () => {
      const request = {
        query: {
          fields: {
            articles: 'title,content',
            comments: 'body',
          },
        },
      } as any;
      const result = service.parse(request);

      expect(result.fields).toEqual({
        articles: ['title', 'content'],
        comments: ['body'],
      });
    });
  });

  describe('toPrismaOptions', () => {
    it('should convert parsed query to Prisma options', () => {
      const parsed = {
        filter: [
          { field: 'status', operator: 'eq' as const, value: 'published' },
        ],
        sort: [{ field: 'created-at', order: 'desc' as const }],
        page: { offset: 10, limit: 20 },
        include: ['comments'],
        fields: {},
      };

      const result = service.toPrismaOptions(parsed, 'article');

      expect(result).toEqual({
        where: { status: 'published' },
        orderBy: [{ createdAt: 'desc' }],
        skip: 10,
        take: 20,
        include: { comments: true },
      });
    });

    it('should handle nested filters', () => {
      const parsed = {
        filter: [
          { field: 'author.name', operator: 'like' as const, value: 'John' },
        ],
        sort: [],
        page: { offset: 0, limit: 20 },
        include: [],
        fields: {},
      };

      const result = service.toPrismaOptions(parsed, 'article');

      expect(result.where).toEqual({
        author: { name: { contains: 'John' } },
      });
    });
  });

  describe('보안: 쿼리 인젝션 방지', () => {
    it('should ignore invalid field names in filter', () => {
      const request = {
        query: {
          filter: {
            status: 'published',
            "'; DROP TABLE--": 'malicious',
            $where: 'malicious',
            __proto__: 'malicious',
          },
        },
      } as any;
      const result = service.parse(request);

      // 유효한 필드만 포함되어야 함
      expect(result.filter).toEqual([
        { field: 'status', operator: 'eq', value: 'published' },
      ]);
    });

    it('should ignore invalid field names in sort', () => {
      const request = {
        query: {
          sort: "title,-createdAt,'; DROP TABLE--,$where",
        },
      } as any;
      const result = service.parse(request);

      // 유효한 필드만 포함되어야 함
      expect(result.sort).toEqual([
        { field: 'title', order: 'asc' },
        { field: 'createdAt', order: 'desc' },
      ]);
    });

    it('should reject field names exceeding max length', () => {
      const longFieldName = 'a'.repeat(101);
      const request = {
        query: {
          filter: { [longFieldName]: 'value' },
        },
      } as any;
      const result = service.parse(request);

      expect(result.filter).toEqual([]);
    });

    it('should allow valid nested field names', () => {
      const request = {
        query: {
          filter: { 'author.profile.name': { like: 'John' } },
        },
      } as any;
      const result = service.parse(request);

      expect(result.filter).toEqual([
        { field: 'author.profile.name', operator: 'like', value: 'John' },
      ]);
    });
  });
});
