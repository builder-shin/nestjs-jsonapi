import { Test, TestingModule } from '@nestjs/testing';
import { JsonApiQueryService } from '../../../src/services/json-api-query.service';
import { JSON_API_MODULE_OPTIONS } from '../../../src/constants';
import { QueryWhitelistOptions } from '../../../src/interfaces';

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

  // ========================================
  // 화이트리스트 테스트
  // ========================================

  describe('JsonApiQueryService - Whitelist', () => {
    describe('parseWithWhitelist', () => {
      it('whitelist 없으면 모든 쿼리 허용', () => {
        const request = {
          query: {
            filter: { status: 'published', secret: 'hidden' },
            sort: '-createdAt,anyField',
            include: 'author,comments,tags',
            fields: { articles: 'title,content,secretField' },
          },
        } as any;

        const result = service.parseWithWhitelist(request);

        // 모든 쿼리가 그대로 유지되어야 함
        expect(result.parsed.filter).toHaveLength(2);
        expect(result.parsed.sort).toHaveLength(2);
        expect(result.parsed.include).toHaveLength(3);
        expect(result.warnings).toEqual([]);
        expect(result.errors).toEqual([]);
      });

      it('whitelist가 undefined면 모든 쿼리 허용', () => {
        const request = {
          query: {
            filter: { status: 'published' },
          },
        } as any;

        const result = service.parseWithWhitelist(request, undefined);

        expect(result.parsed.filter).toHaveLength(1);
        expect(result.warnings).toEqual([]);
        expect(result.errors).toEqual([]);
      });
    });

    describe('validateFilters', () => {
      it('허용된 필터만 통과시킨다', () => {
        const request = {
          query: {
            filter: {
              status: 'published',
              createdAt: { gte: '2024-01-01' },
              password: 'secret',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['status', 'createdAt'],
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.filter).toHaveLength(2);
        expect(result.parsed.filter.map((f) => f.field)).toEqual([
          'status',
          'createdAt',
        ]);
      });

      it('허용되지 않은 필터를 무시한다 (ignore 모드)', () => {
        const request = {
          query: {
            filter: {
              status: 'published',
              password: 'secret',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['status'],
          onDisallowed: 'ignore',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.filter).toHaveLength(1);
        expect(result.parsed.filter[0].field).toBe('status');
        expect(result.warnings).toContain(
          "Filter field 'password' is not allowed",
        );
        expect(result.errors).toEqual([]);
      });

      it('허용되지 않은 필터에 에러를 발생시킨다 (error 모드)', () => {
        const request = {
          query: {
            filter: {
              status: 'published',
              password: 'secret',
              internal: 'data',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['status'],
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.filter).toHaveLength(1);
        expect(result.errors).toContain(
          "Filter field 'password' is not allowed",
        );
        expect(result.errors).toContain(
          "Filter field 'internal' is not allowed",
        );
        expect(result.warnings).toEqual([]);
      });

      it('중첩 필터를 올바르게 검증한다', () => {
        const request = {
          query: {
            filter: {
              'author.name': { like: 'John' },
              'author.email': { like: 'john@' },
              'comments.author.id': { eq: '123' },
            },
          },
        } as any;

        // 'author' 필드가 허용되면 'author.name', 'author.email' 모두 허용
        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['author', 'status'],
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        // author.name, author.email은 허용 (부모 'author'가 허용됨)
        // comments.author.id는 거부
        expect(result.parsed.filter).toHaveLength(2);
        expect(result.parsed.filter.map((f) => f.field)).toEqual([
          'author.name',
          'author.email',
        ]);
        expect(result.errors).toContain(
          "Filter field 'comments.author.id' is not allowed",
        );
      });

      it('빈 배열이면 모든 필터 비활성화', () => {
        const request = {
          query: {
            filter: {
              status: 'published',
              title: 'Hello',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFilters: [],
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.filter).toHaveLength(0);
        expect(result.errors).toHaveLength(2);
      });

      it('정확히 일치하는 중첩 필터도 허용한다', () => {
        const request = {
          query: {
            filter: {
              'author.name': { like: 'John' },
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['author.name'],
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.filter).toHaveLength(1);
        expect(result.warnings).toEqual([]);
      });
    });

    describe('validateSorts', () => {
      it('허용된 정렬 필드만 통과시킨다', () => {
        const request = {
          query: {
            sort: '-createdAt,title,password',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedSorts: ['createdAt', 'title'],
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.sort).toHaveLength(2);
        expect(result.parsed.sort.map((s) => s.field)).toEqual([
          'createdAt',
          'title',
        ]);
      });

      it('허용되지 않은 정렬을 무시한다 (ignore 모드)', () => {
        const request = {
          query: {
            sort: '-createdAt,secretField',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedSorts: ['createdAt'],
          onDisallowed: 'ignore',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.sort).toHaveLength(1);
        expect(result.warnings).toContain(
          "Sort field 'secretField' is not allowed",
        );
        expect(result.errors).toEqual([]);
      });

      it('허용되지 않은 정렬에 에러를 발생시킨다 (error 모드)', () => {
        const request = {
          query: {
            sort: 'title,-internal',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedSorts: ['title'],
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.sort).toHaveLength(1);
        expect(result.errors).toContain(
          "Sort field 'internal' is not allowed",
        );
      });

      it('빈 배열이면 모든 정렬 비활성화', () => {
        const request = {
          query: {
            sort: '-createdAt,title',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedSorts: [],
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.sort).toHaveLength(0);
        expect(result.errors).toHaveLength(2);
      });
    });

    describe('validateIncludes', () => {
      it('허용된 include만 통과시킨다', () => {
        const request = {
          query: {
            include: 'author,comments,tags,secretRelation',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedIncludes: ['author', 'comments', 'tags'],
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.include).toHaveLength(3);
        expect(result.parsed.include).toEqual(['author', 'comments', 'tags']);
      });

      it('최대 깊이를 초과하면 거부한다', () => {
        const request = {
          query: {
            include: 'author,author.profile,author.profile.avatar',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          maxIncludeDepth: 2,
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        // author (깊이 1), author.profile (깊이 2) 허용
        // author.profile.avatar (깊이 3) 거부
        expect(result.parsed.include).toHaveLength(2);
        expect(result.parsed.include).toEqual(['author', 'author.profile']);
        expect(result.errors).toContain(
          "Include 'author.profile.avatar' exceeds max depth of 2",
        );
      });

      it('부모 허용 시 자식도 허용한다 (author -> author.profile)', () => {
        const request = {
          query: {
            include: 'author.profile,author.posts,tags',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedIncludes: ['author', 'tags'],
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        // 'author'가 허용되면 'author.profile', 'author.posts' 모두 허용
        expect(result.parsed.include).toHaveLength(3);
        expect(result.warnings).toEqual([]);
        expect(result.errors).toEqual([]);
      });

      it('허용되지 않은 include를 무시한다 (ignore 모드)', () => {
        const request = {
          query: {
            include: 'author,secrets',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedIncludes: ['author'],
          onDisallowed: 'ignore',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.include).toHaveLength(1);
        expect(result.warnings).toContain("Include 'secrets' is not allowed");
      });

      it('빈 배열이면 모든 include 비활성화', () => {
        const request = {
          query: {
            include: 'author,comments',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedIncludes: [],
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.include).toHaveLength(0);
        expect(result.errors).toHaveLength(2);
      });

      it('깊이와 허용 목록을 동시에 검증한다', () => {
        const request = {
          query: {
            include: 'author,author.profile.avatar,secrets',
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedIncludes: ['author'],
          maxIncludeDepth: 2,
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        // author (깊이 1, 허용) - 통과
        // author.profile.avatar (깊이 3, 허용목록에는 있지만 깊이 초과) - 깊이 체크가 먼저
        // secrets (깊이 1, 허용목록에 없음) - 거부
        expect(result.parsed.include).toHaveLength(1);
        expect(result.parsed.include).toEqual(['author']);
        expect(result.errors).toContain(
          "Include 'author.profile.avatar' exceeds max depth of 2",
        );
        expect(result.errors).toContain("Include 'secrets' is not allowed");
      });
    });

    describe('validateFields', () => {
      it('타입별 허용 필드만 통과시킨다', () => {
        const request = {
          query: {
            fields: {
              articles: 'title,content,password',
              users: 'name,email,ssn',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFields: {
            articles: ['title', 'content'],
            users: ['name', 'email'],
          },
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.fields.articles).toEqual(['title', 'content']);
        expect(result.parsed.fields.users).toEqual(['name', 'email']);
        expect(result.errors).toContain(
          "Field 'password' for type 'articles' is not allowed",
        );
        expect(result.errors).toContain(
          "Field 'ssn' for type 'users' is not allowed",
        );
      });

      it('설정되지 않은 타입은 모든 필드 허용', () => {
        const request = {
          query: {
            fields: {
              articles: 'title,content',
              comments: 'body,author',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFields: {
            articles: ['title'],
          },
        };

        const result = service.parseWithWhitelist(request, whitelist);

        // articles는 title만 허용
        expect(result.parsed.fields.articles).toEqual(['title']);
        // comments는 설정 없으므로 모두 허용
        expect(result.parsed.fields.comments).toEqual(['body', 'author']);
      });

      it('허용되지 않은 필드를 무시한다 (ignore 모드)', () => {
        const request = {
          query: {
            fields: {
              articles: 'title,secret',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFields: {
            articles: ['title'],
          },
          onDisallowed: 'ignore',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.fields.articles).toEqual(['title']);
        expect(result.warnings).toContain(
          "Field 'secret' for type 'articles' is not allowed",
        );
        expect(result.errors).toEqual([]);
      });

      it('빈 배열이면 해당 타입의 모든 필드 비활성화', () => {
        const request = {
          query: {
            fields: {
              articles: 'title,content',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFields: {
            articles: [],
          },
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.fields.articles).toEqual([]);
        expect(result.errors).toHaveLength(2);
      });
    });

    describe('종합 테스트', () => {
      it('모든 화이트리스트 옵션을 동시에 적용한다', () => {
        const request = {
          query: {
            filter: {
              status: 'published',
              password: 'secret',
            },
            sort: '-createdAt,secretField',
            include: 'author,secrets',
            fields: {
              articles: 'title,content,password',
            },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['status', 'createdAt'],
          allowedSorts: ['createdAt', 'title'],
          allowedIncludes: ['author', 'comments'],
          maxIncludeDepth: 2,
          allowedFields: {
            articles: ['title', 'content'],
          },
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        // 필터: status만 허용
        expect(result.parsed.filter).toHaveLength(1);
        expect(result.parsed.filter[0].field).toBe('status');

        // 정렬: createdAt만 허용
        expect(result.parsed.sort).toHaveLength(1);
        expect(result.parsed.sort[0].field).toBe('createdAt');

        // Include: author만 허용
        expect(result.parsed.include).toHaveLength(1);
        expect(result.parsed.include[0]).toBe('author');

        // Fields: title, content만 허용
        expect(result.parsed.fields.articles).toEqual(['title', 'content']);

        // 에러 확인
        expect(result.errors).toContain(
          "Filter field 'password' is not allowed",
        );
        expect(result.errors).toContain(
          "Sort field 'secretField' is not allowed",
        );
        expect(result.errors).toContain("Include 'secrets' is not allowed");
        expect(result.errors).toContain(
          "Field 'password' for type 'articles' is not allowed",
        );
      });

      it('onDisallowed 기본값은 ignore', () => {
        const request = {
          query: {
            filter: { status: 'published', password: 'secret' },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['status'],
          // onDisallowed 미지정
        };

        const result = service.parseWithWhitelist(request, whitelist);

        expect(result.parsed.filter).toHaveLength(1);
        expect(result.warnings).toContain(
          "Filter field 'password' is not allowed",
        );
        expect(result.errors).toEqual([]);
      });
    });
  });
});
