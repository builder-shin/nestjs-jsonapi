import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './test-app/app.module';

describe('JSON:API CRUD (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  describe('GET /articles', () => {
    it('should return JSON:API formatted response', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles')
        .expect(200);

      expect(response.headers['content-type']).toContain(
        'application/vnd.api+json',
      );
      expect(response.body).toHaveProperty('jsonapi');
      expect(response.body.jsonapi.version).toBe('1.1');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?page[offset]=0&page[limit]=5')
        .expect(200);

      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta.page.limit).toBe(5);
    });

    it('should support filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?filter[status]=published')
        .expect(200);

      // All returned articles should have status: published
      for (const article of response.body.data) {
        expect(article.attributes.status).toBe('published');
      }
    });

    it('should support sorting', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles?sort=-created-at')
        .expect(200);

      // Articles should be sorted by createdAt descending
      const dates = response.body.data.map((a: any) =>
        new Date(a.attributes['created-at']).getTime(),
      );
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe('POST /articles', () => {
    it('should create an article', async () => {
      const response = await request(app.getHttpServer())
        .post('/articles')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            type: 'articles',
            attributes: {
              title: 'Test Article',
              content: 'Test content',
            },
          },
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.attributes.title).toBe('Test Article');
    });

    it('should return validation errors in JSON:API format', async () => {
      const response = await request(app.getHttpServer())
        .post('/articles')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            type: 'articles',
            attributes: {
              title: '', // Invalid: too short
            },
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors[0]).toHaveProperty('source');
      expect(response.body.errors[0].source.pointer).toContain(
        '/data/attributes',
      );
    });
  });

  describe('GET /articles/:id', () => {
    it('should return a single article', async () => {
      // First create an article
      const createResponse = await request(app.getHttpServer())
        .post('/articles')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            type: 'articles',
            attributes: {
              title: 'Test Article',
              content: 'Test content',
            },
          },
        });

      const id = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/articles/${id}`)
        .expect(200);

      expect(response.body.data.id).toBe(id);
    });

    it('should return 404 for non-existent article', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PATCH /articles/:id', () => {
    it('should update an article', async () => {
      // First create an article
      const createResponse = await request(app.getHttpServer())
        .post('/articles')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            type: 'articles',
            attributes: {
              title: 'Original Title',
              content: 'Original content',
            },
          },
        });

      const id = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`/articles/${id}`)
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            type: 'articles',
            id,
            attributes: {
              title: 'Updated Title',
            },
          },
        })
        .expect(200);

      expect(response.body.data.attributes.title).toBe('Updated Title');
      expect(response.body.data.attributes.content).toBe('Original content');
    });
  });

  describe('DELETE /articles/:id', () => {
    it('should delete an article', async () => {
      // First create an article
      const createResponse = await request(app.getHttpServer())
        .post('/articles')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            type: 'articles',
            attributes: {
              title: 'To Be Deleted',
              content: 'Content',
            },
          },
        });

      const id = createResponse.body.data.id;

      await request(app.getHttpServer()).delete(`/articles/${id}`).expect(204);

      // Verify it's deleted
      await request(app.getHttpServer()).get(`/articles/${id}`).expect(404);
    });
  });

  // ============================================
  // Bulk Operations Tests
  // ============================================

  describe('POST /articles/_bulk/create (createMany)', () => {
    it('should create multiple articles at once', async () => {
      const response = await request(app.getHttpServer())
        .post('/articles/_bulk/create')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: [
            {
              type: 'articles',
              attributes: {
                title: 'Bulk Article 1',
                content: 'Content 1',
              },
            },
            {
              type: 'articles',
              attributes: {
                title: 'Bulk Article 2',
                content: 'Content 2',
              },
            },
            {
              type: 'articles',
              attributes: {
                title: 'Bulk Article 3',
                content: 'Content 3',
              },
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('meta');
      // createMany action returns meta.created (see serializeNull({ created: count }))
      expect(response.body.meta.created).toBe(3);
    });

    it('should return validation errors for invalid items', async () => {
      const response = await request(app.getHttpServer())
        .post('/articles/_bulk/create')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: [
            {
              type: 'articles',
              attributes: {
                title: '', // Invalid: empty title
                content: 'Content',
              },
            },
          ],
        })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should rollback all on partial failure (transaction)', async () => {
      // First item is valid, second is invalid - entire transaction should rollback
      const countBefore = await request(app.getHttpServer())
        .get('/articles')
        .expect(200);

      const initialCount = countBefore.body.data.length;

      await request(app.getHttpServer())
        .post('/articles/_bulk/create')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: [
            {
              type: 'articles',
              attributes: {
                title: 'Valid Article',
                content: 'Content',
              },
            },
            {
              type: 'articles',
              attributes: {
                title: '', // Invalid
                content: 'Content',
              },
            },
          ],
        })
        .expect(422);

      // Verify rollback: count should not change
      const countAfter = await request(app.getHttpServer())
        .get('/articles')
        .expect(200);

      expect(countAfter.body.data.length).toBe(initialCount);
    });
  });

  describe('PATCH /articles/_bulk/update (updateMany)', () => {
    it('should update multiple articles by filter', async () => {
      // First create test articles
      await request(app.getHttpServer())
        .post('/articles/_bulk/create')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: [
            {
              type: 'articles',
              attributes: {
                title: 'Update Test 1',
                content: 'Content',
                status: 'draft',
              },
            },
            {
              type: 'articles',
              attributes: {
                title: 'Update Test 2',
                content: 'Content',
                status: 'draft',
              },
            },
          ],
        });

      const response = await request(app.getHttpServer())
        .patch('/articles/_bulk/update')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            filter: {
              status: 'draft',
            },
            attributes: {
              status: 'published',
            },
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      // updateMany action returns meta.updated (see serializeNull({ updated: count }))
      expect(response.body.meta.updated).toBeGreaterThanOrEqual(2);
    });

    it('should return count of updated records', async () => {
      const response = await request(app.getHttpServer())
        .patch('/articles/_bulk/update')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            filter: {
              status: 'non-existent-status',
            },
            attributes: {
              status: 'published',
            },
          },
        })
        .expect(200);

      // updateMany action returns meta.updated
      expect(response.body.meta.updated).toBe(0);
    });
  });

  describe('POST /articles/_bulk/delete (deleteMany)', () => {
    it('should delete multiple articles by filter', async () => {
      // First create articles to delete
      await request(app.getHttpServer())
        .post('/articles/_bulk/create')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: [
            {
              type: 'articles',
              attributes: {
                title: 'Delete Test 1',
                content: 'Content',
                status: 'archived',
              },
            },
            {
              type: 'articles',
              attributes: {
                title: 'Delete Test 2',
                content: 'Content',
                status: 'archived',
              },
            },
          ],
        });

      const response = await request(app.getHttpServer())
        .post('/articles/_bulk/delete')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            filter: {
              status: 'archived',
            },
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      // deleteMany action returns meta.deleted (see serializeNull({ deleted: count }))
      expect(response.body.meta.deleted).toBeGreaterThanOrEqual(2);

      // Verify deletion
      const remaining = await request(app.getHttpServer())
        .get('/articles?filter[status]=archived')
        .expect(200);

      expect(remaining.body.data.length).toBe(0);
    });

    it('should use POST method (not DELETE) for body support', async () => {
      // Using POST because DELETE method may not support body
      const response = await request(app.getHttpServer())
        .post('/articles/_bulk/delete')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: {
            filter: {
              status: 'non-existent',
            },
          },
        })
        .expect(200);

      // deleteMany action returns meta.deleted
      expect(response.body.meta.deleted).toBe(0);
    });
  });

  describe('PUT /articles/_bulk/upsert (upsertMany)', () => {
    it('should upsert multiple articles', async () => {
      const response = await request(app.getHttpServer())
        .put('/articles/_bulk/upsert')
        .set('Content-Type', 'application/vnd.api+json')
        .send({
          data: [
            {
              type: 'articles',
              attributes: {
                title: 'Upsert Test 1',
                content: 'Content 1',
              },
            },
            {
              type: 'articles',
              attributes: {
                title: 'Upsert Test 2',
                content: 'Content 2',
              },
            },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      // upsertMany action returns meta.upserted (see serializeNull({ upserted: count }))
      expect(response.body.meta.upserted).toBe(2);
    });
  });
});
