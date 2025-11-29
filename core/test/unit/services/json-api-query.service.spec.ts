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

  describe('Security: Query Injection Prevention', () => {
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

      // Only valid fields should be included
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

      // Only valid fields should be included
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
  // Whitelist Tests
  // ========================================

  describe('JsonApiQueryService - Whitelist', () => {
    describe('parseWithWhitelist', () => {
      it('should allow all queries when no whitelist is provided', () => {
        const request = {
          query: {
            filter: { status: 'published', secret: 'hidden' },
            sort: '-createdAt,anyField',
            include: 'author,comments,tags',
            fields: { articles: 'title,content,secretField' },
          },
        } as any;

        const result = service.parseWithWhitelist(request);

        // All queries should be preserved as-is
        expect(result.parsed.filter).toHaveLength(2);
        expect(result.parsed.sort).toHaveLength(2);
        expect(result.parsed.include).toHaveLength(3);
        expect(result.warnings).toEqual([]);
        expect(result.errors).toEqual([]);
      });

      it('should allow all queries when whitelist is undefined', () => {
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
      it('should only allow permitted filters', () => {
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

      it('should ignore disallowed filters (ignore mode)', () => {
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

      it('should raise error for disallowed filters (error mode)', () => {
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

      it('should correctly validate nested filters', () => {
        const request = {
          query: {
            filter: {
              'author.name': { like: 'John' },
              'author.email': { like: 'john@' },
              'comments.author.id': { eq: '123' },
            },
          },
        } as any;

        // When 'author' field is allowed, both 'author.name' and 'author.email' are allowed
        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['author', 'status'],
          onDisallowed: 'error',
        };

        const result = service.parseWithWhitelist(request, whitelist);

        // author.name, author.email are allowed (parent 'author' is allowed)
        // comments.author.id is rejected
        expect(result.parsed.filter).toHaveLength(2);
        expect(result.parsed.filter.map((f) => f.field)).toEqual([
          'author.name',
          'author.email',
        ]);
        expect(result.errors).toContain(
          "Filter field 'comments.author.id' is not allowed",
        );
      });

      it('should disable all filters when array is empty', () => {
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

      it('should also allow exact matching nested filters', () => {
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
      it('should only allow permitted sort fields', () => {
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

      it('should ignore disallowed sorts (ignore mode)', () => {
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

      it('should raise error for disallowed sorts (error mode)', () => {
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

      it('should disable all sorts when array is empty', () => {
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
      it('should only allow permitted includes', () => {
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

      it('should reject when max depth is exceeded', () => {
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

        // author (depth 1), author.profile (depth 2) allowed
        // author.profile.avatar (depth 3) rejected
        expect(result.parsed.include).toHaveLength(2);
        expect(result.parsed.include).toEqual(['author', 'author.profile']);
        expect(result.errors).toContain(
          "Include 'author.profile.avatar' exceeds max depth of 2",
        );
      });

      it('should allow children when parent is allowed (author -> author.profile)', () => {
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

        // When 'author' is allowed, both 'author.profile' and 'author.posts' are allowed
        expect(result.parsed.include).toHaveLength(3);
        expect(result.warnings).toEqual([]);
        expect(result.errors).toEqual([]);
      });

      it('should ignore disallowed includes (ignore mode)', () => {
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

      it('should disable all includes when array is empty', () => {
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

      it('should validate both depth and allowed list simultaneously', () => {
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

        // author (depth 1, allowed) - passes
        // author.profile.avatar (depth 3, in allowed list but exceeds depth) - depth check first
        // secrets (depth 1, not in allowed list) - rejected
        expect(result.parsed.include).toHaveLength(1);
        expect(result.parsed.include).toEqual(['author']);
        expect(result.errors).toContain(
          "Include 'author.profile.avatar' exceeds max depth of 2",
        );
        expect(result.errors).toContain("Include 'secrets' is not allowed");
      });
    });

    describe('validateFields', () => {
      it('should only allow permitted fields per type', () => {
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

      it('should allow all fields for unconfigured types', () => {
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

        // articles allows only title
        expect(result.parsed.fields.articles).toEqual(['title']);
        // comments has no configuration, so all fields are allowed
        expect(result.parsed.fields.comments).toEqual(['body', 'author']);
      });

      it('should ignore disallowed fields (ignore mode)', () => {
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

      it('should disable all fields for a type when array is empty', () => {
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

    describe('Integration Tests', () => {
      it('should apply all whitelist options simultaneously', () => {
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

        // Filter: only status allowed
        expect(result.parsed.filter).toHaveLength(1);
        expect(result.parsed.filter[0].field).toBe('status');

        // Sort: only createdAt allowed
        expect(result.parsed.sort).toHaveLength(1);
        expect(result.parsed.sort[0].field).toBe('createdAt');

        // Include: only author allowed
        expect(result.parsed.include).toHaveLength(1);
        expect(result.parsed.include[0]).toBe('author');

        // Fields: only title and content allowed
        expect(result.parsed.fields.articles).toEqual(['title', 'content']);

        // Verify errors
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

      it('should default onDisallowed to ignore', () => {
        const request = {
          query: {
            filter: { status: 'published', password: 'secret' },
          },
        } as any;

        const whitelist: QueryWhitelistOptions = {
          allowedFilters: ['status'],
          // onDisallowed not specified
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
