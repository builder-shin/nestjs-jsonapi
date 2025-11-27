/**
 * JSON:API Query DTO
 *
 * JSON:API 쿼리 파라미터의 타입 정의 및 검증
 *
 * @packageDocumentation
 * @module dto
 *
 * 의존성: 없음
 */

import {
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * 페이지네이션 파라미터 DTO
 *
 * @description
 * limit의 최댓값 검증은 DTO 레벨이 아닌 서비스 레벨(JsonApiQueryService.parsePage)에서
 * 수행됩니다. 이를 통해 모듈 옵션의 `pagination.maxLimit` 설정과 동기화되며,
 * 설정 변경 시 DTO를 수정할 필요가 없습니다.
 *
 * @see JsonApiQueryService.parsePage - maxLimit 검증 로직
 * @see JsonApiModuleOptions.pagination.maxLimit - 설정값
 *
 * @example
 * ```typescript
 * // URL: ?page[offset]=0&page[limit]=20
 * const page: PageDto = { offset: 0, limit: 20 };
 * ```
 */
export class PageDto {
  /**
   * 시작 위치 (0-based)
   *
   * @remarks
   * offset 기반 페이지네이션을 사용합니다.
   */
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'page[offset]는 정수여야 합니다' })
  @Min(0, { message: 'page[offset]는 0 이상이어야 합니다' })
  offset?: number;

  /**
   * 페이지 크기 (결과 개수)
   *
   * @remarks
   * 최댓값은 모듈 옵션의 `pagination.maxLimit`에 의해 서비스 레벨에서 제한됩니다.
   * 이 값을 초과하는 요청은 자동으로 maxLimit으로 조정됩니다 (에러 발생 없음).
   */
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'page[limit]는 정수여야 합니다' })
  @Min(1, { message: 'page[limit]는 1 이상이어야 합니다' })
  limit?: number;
}

/**
 * JSON:API Query Parameters DTO
 *
 * URL 쿼리 파라미터 검증용 DTO
 * JSON:API 1.1 스펙에 따른 쿼리 파라미터를 정의합니다.
 *
 * @example
 * ```typescript
 * // URL: ?filter[status]=published&sort=-createdAt&page[limit]=10&include=author
 * const query: JsonApiQueryDto = {
 *   filter: { status: 'published' },
 *   sort: '-createdAt',
 *   page: { limit: 10 },
 *   include: 'author'
 * };
 * ```
 */
export class JsonApiQueryDto {
  /**
   * 필터 파라미터
   *
   * @description
   * 리소스 필터링을 위한 조건 객체
   * 다양한 연산자를 지원합니다: eq, ne, gt, gte, lt, lte, in, contains 등
   *
   * @example filter[status]=published&filter[age][gte]=18
   */
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;

  /**
   * 정렬 파라미터
   *
   * @description
   * 유효한 형식: 쉼표로 구분된 필드명
   * - 필드명 앞에 `-`가 붙으면 내림차순
   * - `-`가 없으면 오름차순
   *
   * @example sort=-createdAt,title
   */
  @IsString()
  @IsOptional()
  @Matches(/^-?[a-zA-Z_][a-zA-Z0-9_]*(,-?[a-zA-Z_][a-zA-Z0-9_]*)*$/, {
    message:
      'sort 파라미터 형식이 올바르지 않습니다. 예: sort=-createdAt,title',
  })
  sort?: string;

  /**
   * 페이지네이션 파라미터
   *
   * @description
   * offset/limit 기반 페이지네이션을 지원합니다.
   *
   * @example page[offset]=0&page[limit]=20
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => PageDto)
  page?: PageDto;

  /**
   * 관계 포함 파라미터
   *
   * @description
   * 유효한 형식: 쉼표로 구분된 관계 경로
   * - 점(.)으로 중첩 관계를 표현
   *
   * @example include=comments,author.profile
   */
  @IsString()
  @IsOptional()
  @Matches(
    /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*(,[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*)*$/,
    {
      message:
        'include 파라미터 형식이 올바르지 않습니다. 예: include=comments,author.profile',
    },
  )
  include?: string;

  /**
   * Sparse Fieldsets 파라미터
   *
   * @description
   * 리소스 타입별로 반환할 필드를 지정합니다.
   * 네트워크 대역폭 절약에 유용합니다.
   *
   * @example fields[articles]=title,content
   */
  @IsObject()
  @IsOptional()
  fields?: Record<string, string>;
}
