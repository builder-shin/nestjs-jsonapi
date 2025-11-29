import { Test, TestingModule } from '@nestjs/testing';
import { JsonApiSerializerService } from '../../../src/services/json-api-serializer.service';
import { JsonApiSerializer, Attribute } from '../../../src';
import { JsonApiResource } from '../../../src/interfaces/json-api.interface';

// Test Serializer definition
@JsonApiSerializer({ type: 'articles' })
class TestArticleSerializer {
  @Attribute()
  title!: string;

  @Attribute()
  content!: string;

  @Attribute({ name: 'created-at' })
  createdAt!: Date;
}

describe('JsonApiSerializerService', () => {
  let service: JsonApiSerializerService;

  beforeEach(async () => {
    // Since JsonApiSerializerService has no constructor injection,
    // JSON_API_MODULE_OPTIONS provider is unnecessary
    const module: TestingModule = await Test.createTestingModule({
      providers: [JsonApiSerializerService],
    }).compile();

    service = module.get<JsonApiSerializerService>(JsonApiSerializerService);
  });

  describe('serializeOne', () => {
    it('should serialize a single resource', () => {
      const article = {
        id: '1',
        title: 'Test Article',
        content: 'Test content',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const result = service.serializeOne(article, TestArticleSerializer, {
        baseUrl: 'http://localhost:3000',
      });

      expect(result.jsonapi.version).toBe('1.1');
      // Note: toResource doesn't add links to individual resources
      // links only exist at the document level (result.links)
      expect(result.data).toEqual({
        type: 'articles',
        id: '1',
        attributes: {
          title: 'Test Article',
          content: 'Test content',
          'created-at': '2024-01-01T00:00:00.000Z',
        },
      });
      // Document level links verification
      expect(result.links?.self).toBe('http://localhost:3000/articles/1');
    });

    it('should handle null resource', () => {
      const result = service.serializeOne(null, TestArticleSerializer, {
        baseUrl: 'http://localhost:3000',
      });

      expect(result.data).toBeNull();
    });
  });

  describe('serializeMany', () => {
    it('should serialize multiple resources', () => {
      const articles = [
        {
          id: '1',
          title: 'Article 1',
          content: 'Content 1',
          createdAt: new Date(),
        },
        {
          id: '2',
          title: 'Article 2',
          content: 'Content 2',
          createdAt: new Date(),
        },
      ];

      const result = service.serializeMany(articles, TestArticleSerializer, {
        baseUrl: 'http://localhost:3000',
        pagination: { offset: 0, limit: 20, total: 2 },
      });

      expect(result.jsonapi.version).toBe('1.1');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta?.page).toEqual({ offset: 0, limit: 20, total: 2 });
    });

    it('should handle empty array', () => {
      const result = service.serializeMany([], TestArticleSerializer, {
        baseUrl: 'http://localhost:3000',
      });

      expect(result.data).toEqual([]);
    });
  });

  describe('attribute name transformation', () => {
    it('should transform camelCase to kebab-case', () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'Content',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const result = service.serializeOne(article, TestArticleSerializer, {
        baseUrl: 'http://localhost:3000',
      });

      // createdAt should be converted to created-at
      const data = result.data as JsonApiResource<typeof article>;
      expect(data?.attributes).toHaveProperty('created-at');
      expect(data?.attributes).not.toHaveProperty('createdAt');
    });
  });
});
