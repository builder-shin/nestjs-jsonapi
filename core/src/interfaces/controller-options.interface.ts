/**
 * 컨트롤러 옵션 및 액션 타입 정의
 *
 * @packageDocumentation
 * @module interfaces
 */

import { Type } from '@nestjs/common';

/**
 * 기본 CRUD 액션 타입
 */
export type CrudAction =
  | 'index'
  | 'show'
  | 'create'
  | 'createMany'
  | 'update'
  | 'updateMany'
  | 'upsert'
  | 'upsertMany'
  | 'delete'
  | 'deleteMany';

/**
 * 기본 CRUD 액션 목록
 */
export const CRUD_ACTIONS: CrudAction[] = [
  'index',
  'show',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'upsertMany',
  'delete',
  'deleteMany',
];

/**
 * 액션 타입 (기본 CRUD + 커스텀 액션)
 *
 * 커스텀 액션은 문자열로 자유롭게 정의 가능합니다.
 *
 * @example
 * ```typescript
 * // 기본 CRUD
 * only: ['index', 'show', 'create']
 *
 * // 커스텀 액션 포함
 * only: ['show', 'update', 'delete', 'publish', 'archive']
 * ```
 */
export type ActionType = CrudAction | (string & {});

/**
 * 컨트롤러 데코레이터 옵션
 *
 * @JsonApiController 데코레이터에 전달하는 설정 객체입니다.
 *
 * @template CreateDto - 생성 DTO 타입
 * @template UpdateDto - 수정 DTO 타입
 *
 * @example
 * ```typescript
 * @JsonApiController({
 *   model: 'article',
 *   serializer: ArticleSerializer,
 *   dto: {
 *     create: CreateArticleDto,
 *     update: UpdateArticleDto,
 *   },
 *   only: ['index', 'show', 'create', 'update', 'delete'],
 *   type: 'articles',
 * })
 * export class ArticlesController extends JsonApiCrudController {}
 * ```
 */
export interface JsonApiControllerOptions<CreateDto = any, UpdateDto = any> {
  /**
   * Prisma 모델명 (소문자)
   * @example 'article'
   */
  model: string;

  /**
   * Serializer 클래스
   */
  serializer: Type<any>;

  /**
   * DTO 클래스 설정
   */
  dto?: {
    create?: Type<CreateDto>;
    update?: Type<UpdateDto>;
  };

  /**
   * 활성화할 액션 (only와 except 중 하나만 사용)
   * 기본 CRUD + 커스텀 액션 모두 지정 가능
   */
  only?: ActionType[];

  /**
   * 비활성화할 액션 (only와 except 중 하나만 사용)
   */
  except?: ActionType[];

  /**
   * 리소스 타입명 (JSON:API type 필드)
   * 미지정시 model을 복수형으로 변환하여 사용
   * @example 'articles'
   */
  type?: string;
}

/**
 * 액션 훅 옵션
 *
 * @BeforeAction, @AfterAction 데코레이터에 전달하는 설정입니다.
 *
 * @example
 * ```typescript
 * @BeforeAction({ only: ['create', 'update'] })
 * async validateInput() { ... }
 *
 * @AfterAction({ except: ['index'] })
 * async logAction() { ... }
 * ```
 */
export interface ActionHookOptions {
  /**
   * 이 액션들에서만 실행
   * 기본 CRUD + 커스텀 액션명 모두 사용 가능
   * @example only: ['show', 'update', 'delete', 'publish', 'archive']
   */
  only?: ActionType[];

  /**
   * 이 액션들에서는 실행 안 함
   * @example except: ['index', 'show']
   */
  except?: ActionType[];
}

/**
 * 액션 훅 메타데이터
 *
 * 내부적으로 훅 정보를 저장하는데 사용됩니다.
 */
export interface ActionHookMetadata {
  /** 훅이 적용된 메서드 이름 */
  methodName: string;
  /** 훅 옵션 */
  options: ActionHookOptions;
}
