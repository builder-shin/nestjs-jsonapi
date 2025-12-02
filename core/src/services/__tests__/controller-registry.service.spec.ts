/**
 * ControllerRegistryService 단위 테스트
 *
 * DiscoveryService를 통한 컨트롤러 메타데이터 수집 및
 * buildResourceConfig 기능을 검증합니다.
 *
 * @packageDocumentation
 * @module services/__tests__
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from '@nestjs/core';
import { NotFoundException } from '@nestjs/common';
import { ControllerRegistryService } from '../controller-registry.service';
import { JSON_API_CONTROLLER_OPTIONS } from '../../constants';
import { JsonApiModuleOptions } from '../../interfaces';

describe('ControllerRegistryService', () => {
  let service: ControllerRegistryService;
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;

  // Mock 컨트롤러 클래스
  class MockArticleController {}

  // Mock 시리얼라이저 클래스
  class MockArticleSerializer {}

  // Mock 컨트롤러 옵션
  const mockControllerOptions = {
    model: 'article',
    type: 'articles',
    serializer: MockArticleSerializer,
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
  };

  beforeEach(async () => {
    // 메타데이터 설정
    Reflect.defineMetadata(
      JSON_API_CONTROLLER_OPTIONS,
      mockControllerOptions,
      MockArticleController,
    );

    mockDiscoveryService = {
      getControllers: jest.fn().mockReturnValue([
        {
          instance: new MockArticleController(),
          metatype: MockArticleController,
        },
      ]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControllerRegistryService,
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
      ],
    }).compile();

    service = module.get<ControllerRegistryService>(ControllerRegistryService);
    service.onModuleInit();
  });

  afterEach(() => {
    // 테스트 간 메타데이터 정리
    Reflect.deleteMetadata(JSON_API_CONTROLLER_OPTIONS, MockArticleController);
  });

  describe('onModuleInit', () => {
    it('DiscoveryService를 통해 컨트롤러 수집', () => {
      expect(mockDiscoveryService.getControllers).toHaveBeenCalled();
      expect(service.getAll().size).toBe(1);
    });

    it('메타데이터 없는 컨트롤러는 무시', async () => {
      class NonJsonApiController {}

      mockDiscoveryService.getControllers.mockReturnValue([
        {
          instance: new NonJsonApiController(),
          metatype: NonJsonApiController,
        } as any,
      ]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ControllerRegistryService,
          {
            provide: DiscoveryService,
            useValue: mockDiscoveryService,
          },
        ],
      }).compile();

      const newService = module.get<ControllerRegistryService>(
        ControllerRegistryService,
      );
      newService.onModuleInit();

      expect(newService.getAll().size).toBe(0);
    });

    it('instance 없는 컨트롤러는 무시', async () => {
      mockDiscoveryService.getControllers.mockReturnValue([
        {
          instance: null,
          metatype: MockArticleController,
        } as any,
      ]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ControllerRegistryService,
          {
            provide: DiscoveryService,
            useValue: mockDiscoveryService,
          },
        ],
      }).compile();

      const newService = module.get<ControllerRegistryService>(
        ControllerRegistryService,
      );
      newService.onModuleInit();

      expect(newService.getAll().size).toBe(0);
    });

    it('metatype이 함수가 아닌 경우 무시', async () => {
      mockDiscoveryService.getControllers.mockReturnValue([
        {
          instance: {},
          metatype: 'not-a-function' as any,
        } as any,
      ]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ControllerRegistryService,
          {
            provide: DiscoveryService,
            useValue: mockDiscoveryService,
          },
        ],
      }).compile();

      const newService = module.get<ControllerRegistryService>(
        ControllerRegistryService,
      );
      newService.onModuleInit();

      expect(newService.getAll().size).toBe(0);
    });
  });

  describe('getByModel', () => {
    it('특정 모델 조회', () => {
      const options = service.getByModel('article');
      expect(options).toBeDefined();
      expect(options?.model).toBe('article');
    });

    it('존재하지 않는 모델 조회 시 undefined 반환', () => {
      const options = service.getByModel('nonexistent');
      expect(options).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('모든 등록된 컨트롤러 반환', () => {
      const all = service.getAll();
      expect(all).toBeInstanceOf(Map);
      expect(all.size).toBe(1);
      expect(all.has('article')).toBe(true);
    });
  });

  describe('buildResourceConfig', () => {
    const baseModuleOptions: JsonApiModuleOptions = {
      pagination: { defaultLimit: 20, maxLimit: 100 },
      serverConfig: { enabled: true, password: 'test-password' },
    };

    describe('detailLevel: minimal', () => {
      it('기본 정보만 반환', () => {
        const config = service.buildResourceConfig('article', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'minimal',
          },
        });

        expect(config.model).toBe('article');
        expect(config.type).toBe('articles');
        expect(config.enabledActions).toBeDefined();
        expect(config.pagination).toBeDefined();
        expect(config.query).toBeUndefined();
        expect(config.relationships).toBeUndefined();
        expect(config.validation).toBeUndefined();
      });

      it('pagination 기본값 적용', () => {
        const config = service.buildResourceConfig('article', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'minimal',
          },
        });

        expect(config.pagination.defaultLimit).toBe(20);
        expect(config.pagination.maxLimit).toBe(100);
      });
    });

    describe('detailLevel: standard', () => {
      it('쿼리 설정 포함', () => {
        const config = service.buildResourceConfig('article', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'standard',
          },
        });

        expect(config.query).toBeDefined();
        expect(config.query?.allowedFilters).toEqual(['status', 'authorId']);
        expect(config.query?.allowedSorts).toEqual(['createdAt', 'title']);
        expect(config.query?.allowedIncludes).toEqual(['author', 'comments']);
        expect(config.query?.maxIncludeDepth).toBe(2);
      });

      it('관계 정보 포함', () => {
        const config = service.buildResourceConfig('article', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'standard',
          },
        });

        expect(config.relationships).toBeDefined();
        expect(config.relationships?.author.cardinality).toBe('one');
        expect(config.relationships?.author.type).toBe('users');
        expect(config.relationships?.comments.cardinality).toBe('many');
        expect(config.relationships?.comments.type).toBe('comments');
      });

      it('validation은 포함하지 않음', () => {
        const config = service.buildResourceConfig('article', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'standard',
          },
        });

        expect(config.validation).toBeUndefined();
      });
    });

    describe('detailLevel: full', () => {
      it('쿼리 설정 및 관계 정보 포함', () => {
        const config = service.buildResourceConfig('article', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'full',
          },
        });

        expect(config.query).toBeDefined();
        expect(config.relationships).toBeDefined();
        // validation은 DTO에 class-validator 데코레이터가 없으면 undefined
      });
    });

    describe('detailLevel 기본값', () => {
      it('detailLevel 미지정 시 standard 사용', () => {
        const config = service.buildResourceConfig('article', baseModuleOptions);

        // standard 레벨이므로 query와 relationships 포함
        expect(config.query).toBeDefined();
        expect(config.relationships).toBeDefined();
        expect(config.validation).toBeUndefined();
      });
    });

    describe('enabledActions', () => {
      it('only 옵션 적용', () => {
        const config = service.buildResourceConfig('article', baseModuleOptions);
        expect(config.enabledActions).toEqual([
          'index',
          'show',
          'create',
          'update',
          'delete',
        ]);
      });

      it('only 미설정 시 기본 액션 전체 반환', async () => {
        // only가 없는 컨트롤러 옵션
        class MockUserController {}
        Reflect.defineMetadata(
          JSON_API_CONTROLLER_OPTIONS,
          {
            model: 'user',
            type: 'users',
            serializer: MockArticleSerializer,
          },
          MockUserController,
        );

        mockDiscoveryService.getControllers.mockReturnValue([
          {
            instance: new MockUserController(),
            metatype: MockUserController,
          } as any,
        ]);

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ControllerRegistryService,
            {
              provide: DiscoveryService,
              useValue: mockDiscoveryService,
            },
          ],
        }).compile();

        const newService = module.get<ControllerRegistryService>(
          ControllerRegistryService,
        );
        newService.onModuleInit();

        const config = newService.buildResourceConfig('user', baseModuleOptions);

        // 기본 10개 액션 모두 포함
        expect(config.enabledActions).toContain('index');
        expect(config.enabledActions).toContain('show');
        expect(config.enabledActions).toContain('create');
        expect(config.enabledActions).toContain('createMany');
        expect(config.enabledActions).toContain('update');
        expect(config.enabledActions).toContain('updateMany');
        expect(config.enabledActions).toContain('upsert');
        expect(config.enabledActions).toContain('upsertMany');
        expect(config.enabledActions).toContain('delete');
        expect(config.enabledActions).toContain('deleteMany');
      });
    });

    describe('idType', () => {
      it('컨트롤러 옵션의 idType 사용', async () => {
        class MockUuidController {}
        Reflect.defineMetadata(
          JSON_API_CONTROLLER_OPTIONS,
          {
            model: 'post',
            serializer: MockArticleSerializer,
            idType: 'uuid',
          },
          MockUuidController,
        );

        mockDiscoveryService.getControllers.mockReturnValue([
          {
            instance: new MockUuidController(),
            metatype: MockUuidController,
          } as any,
        ]);

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ControllerRegistryService,
            {
              provide: DiscoveryService,
              useValue: mockDiscoveryService,
            },
          ],
        }).compile();

        const newService = module.get<ControllerRegistryService>(
          ControllerRegistryService,
        );
        newService.onModuleInit();

        const config = newService.buildResourceConfig('post', baseModuleOptions);
        expect(config.idType).toBe('uuid');
      });

      it('모듈 옵션의 idType 사용 (컨트롤러 미지정 시)', () => {
        const config = service.buildResourceConfig('article', {
          ...baseModuleOptions,
          idType: 'number',
        });
        expect(config.idType).toBe('number');
      });

      it('기본값 string 사용', () => {
        const config = service.buildResourceConfig('article', baseModuleOptions);
        expect(config.idType).toBe('string');
      });
    });

    describe('type 해석', () => {
      it('명시적 type 사용', () => {
        const config = service.buildResourceConfig('article', baseModuleOptions);
        expect(config.type).toBe('articles');
      });

      it('type 미지정 시 모델명 복수형 사용', async () => {
        class MockPersonController {}
        Reflect.defineMetadata(
          JSON_API_CONTROLLER_OPTIONS,
          {
            model: 'person',
            serializer: MockArticleSerializer,
            // type 미지정
          },
          MockPersonController,
        );

        mockDiscoveryService.getControllers.mockReturnValue([
          {
            instance: new MockPersonController(),
            metatype: MockPersonController,
          } as any,
        ]);

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ControllerRegistryService,
            {
              provide: DiscoveryService,
              useValue: mockDiscoveryService,
            },
          ],
        }).compile();

        const newService = module.get<ControllerRegistryService>(
          ControllerRegistryService,
        );
        newService.onModuleInit();

        const config = newService.buildResourceConfig('person', baseModuleOptions);
        expect(config.type).toBe('people'); // 불규칙 복수형
      });
    });

    describe('에러 처리', () => {
      it('존재하지 않는 모델 조회 시 NotFoundException', () => {
        expect(() => {
          service.buildResourceConfig('nonexistent', baseModuleOptions);
        }).toThrow(NotFoundException);
        expect(() => {
          service.buildResourceConfig('nonexistent', baseModuleOptions);
        }).toThrow("Model 'nonexistent' not found");
      });
    });

    describe('query 옵션', () => {
      it('query 미설정 시 빈 배열 반환', async () => {
        class MockSimpleController {}
        Reflect.defineMetadata(
          JSON_API_CONTROLLER_OPTIONS,
          {
            model: 'simple',
            serializer: MockArticleSerializer,
            // query 미설정
          },
          MockSimpleController,
        );

        mockDiscoveryService.getControllers.mockReturnValue([
          {
            instance: new MockSimpleController(),
            metatype: MockSimpleController,
          } as any,
        ]);

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ControllerRegistryService,
            {
              provide: DiscoveryService,
              useValue: mockDiscoveryService,
            },
          ],
        }).compile();

        const newService = module.get<ControllerRegistryService>(
          ControllerRegistryService,
        );
        newService.onModuleInit();

        const config = newService.buildResourceConfig('simple', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'standard',
          },
        });

        expect(config.query?.allowedFilters).toEqual([]);
        expect(config.query?.allowedSorts).toEqual([]);
        expect(config.query?.allowedIncludes).toEqual([]);
        expect(config.query?.maxIncludeDepth).toBe(2);
      });

      it('onDisallowed 옵션 포함', () => {
        const config = service.buildResourceConfig('article', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'standard',
          },
        });

        // 기본값 'ignore'
        expect(config.query?.onDisallowed).toBe('ignore');
      });
    });

    describe('relationships', () => {
      it('relationships 미설정 시 undefined 반환', async () => {
        class MockNoRelController {}
        Reflect.defineMetadata(
          JSON_API_CONTROLLER_OPTIONS,
          {
            model: 'norel',
            serializer: MockArticleSerializer,
            // relationships 미설정
          },
          MockNoRelController,
        );

        mockDiscoveryService.getControllers.mockReturnValue([
          {
            instance: new MockNoRelController(),
            metatype: MockNoRelController,
          } as any,
        ]);

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ControllerRegistryService,
            {
              provide: DiscoveryService,
              useValue: mockDiscoveryService,
            },
          ],
        }).compile();

        const newService = module.get<ControllerRegistryService>(
          ControllerRegistryService,
        );
        newService.onModuleInit();

        const config = newService.buildResourceConfig('norel', {
          ...baseModuleOptions,
          serverConfig: {
            enabled: true,
            password: 'test-password',
            detailLevel: 'standard',
          },
        });

        expect(config.relationships).toBeUndefined();
      });
    });
  });
});
