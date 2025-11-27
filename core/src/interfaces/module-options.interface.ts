/**
 * 모듈 설정 옵션 인터페이스 정의
 *
 * @packageDocumentation
 * @module interfaces
 */

import { ModuleMetadata, Provider } from '@nestjs/common';

/**
 * ID 타입 설정
 *
 * Prisma 모델의 ID 필드 타입에 따라 선택합니다.
 *
 * - 'string': 문자열 ID (기본값)
 * - 'number': 숫자 ID (자동 변환)
 * - 'uuid': UUID 형식 검증
 * - 'cuid': CUID 형식 (v1, v2 모두 지원)
 * - 'auto': 타입 자동 감지
 */
export type IdType = 'string' | 'number' | 'uuid' | 'cuid' | 'auto';

/**
 * 모듈 전역 설정 옵션
 *
 * JsonApiModule.forRoot()에 전달하는 설정 객체입니다.
 *
 * @example
 * ```typescript
 * JsonApiModule.forRoot({
 *   pagination: {
 *     defaultLimit: 20,
 *     maxLimit: 100,
 *   },
 *   baseUrl: 'https://api.example.com',
 *   idType: 'uuid',
 * });
 * ```
 */
export interface JsonApiModuleOptions {
  /**
   * 페이지네이션 설정 (필수)
   */
  pagination: {
    /**
     * 기본 페이지 크기
     */
    defaultLimit: number;
    /**
     * 최대 페이지 크기
     */
    maxLimit: number;
  };

  /**
   * 전역 기본 URL (선택)
   * @example 'https://api.example.com'
   */
  baseUrl?: string;

  /**
   * Prisma 서비스 주입 토큰 (선택)
   * @default 'PRISMA_SERVICE'
   */
  prismaServiceToken?: string | symbol;

  /**
   * ID 타입 설정 (선택)
   * - 'string': 문자열 ID (기본값)
   * - 'number': 숫자 ID (자동 변환)
   * - 'uuid': UUID 형식 검증
   * - 'cuid': CUID 형식
   * - 'auto': 타입 자동 감지
   * @default 'string'
   */
  idType?: IdType;

  /**
   * 디버그 모드 활성화 (선택)
   * @default false
   */
  debug?: boolean;
}

/**
 * 비동기 모듈 설정 옵션
 *
 * JsonApiModule.forRootAsync()에 전달하는 설정 객체입니다.
 *
 * @example
 * ```typescript
 * JsonApiModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     pagination: {
 *       defaultLimit: config.get('PAGINATION_DEFAULT'),
 *       maxLimit: config.get('PAGINATION_MAX'),
 *     },
 *   }),
 *   inject: [ConfigService],
 * });
 * ```
 */
export interface JsonApiModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * 옵션 팩토리 함수
   */
  useFactory: (
    ...args: any[]
  ) => Promise<JsonApiModuleOptions> | JsonApiModuleOptions;

  /**
   * 팩토리에 주입할 의존성
   */
  inject?: any[];

  /**
   * 추가 providers
   */
  extraProviders?: Provider[];

  /**
   * Prisma 서비스 주입 토큰 (선택)
   * forRootAsync에서 직접 지정할 때 사용
   * @default 'PRISMA_SERVICE'
   */
  prismaServiceToken?: string | symbol;
}
