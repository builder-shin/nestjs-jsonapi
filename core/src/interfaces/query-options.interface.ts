/**
 * 쿼리 파라미터 화이트리스트 옵션 인터페이스
 *
 * JSON:API 요청의 필터, 정렬, include, fields 등의 쿼리 파라미터를
 * 제한하여 보안과 성능을 강화합니다.
 *
 * @packageDocumentation
 * @module interfaces
 */

/**
 * 쿼리 파라미터 허용 목록 옵션
 *
 * 허용되지 않은 쿼리 파라미터를 제한하여 다음을 방지합니다:
 * - 민감한 필드로의 필터링 (예: password 필드)
 * - 과도한 관계 포함으로 인한 성능 저하
 * - 인덱스 없는 필드 정렬로 인한 DB 부하
 *
 * @example
 * ```typescript
 * // 기본 사용
 * const options: QueryWhitelistOptions = {
 *   allowedFilters: ['status', 'createdAt', 'author.name'],
 *   allowedSorts: ['createdAt', 'updatedAt', 'title'],
 *   allowedIncludes: ['author', 'comments', 'tags'],
 *   maxIncludeDepth: 2,
 *   onDisallowed: 'error',
 * };
 *
 * // 모든 쿼리 비활성화
 * const strictOptions: QueryWhitelistOptions = {
 *   allowedFilters: [],
 *   allowedSorts: [],
 *   allowedIncludes: [],
 * };
 * ```
 */
export interface QueryWhitelistOptions {
  /**
   * 허용된 필터 필드 목록
   *
   * 필터링에 사용할 수 있는 필드를 명시적으로 지정합니다.
   * 중첩 필드도 지원합니다 (예: 'author.name').
   *
   * - `undefined`: 모든 필터 허용 (기본값, 하위 호환)
   * - 빈 배열 `[]`: 모든 필터 비활성화
   * - 문자열 배열: 해당 필드만 필터링 허용
   *
   * 부모 필드가 허용되면 모든 자식 필드도 허용됩니다.
   * 예: 'author' 허용 시 'author.name', 'author.email' 등 모두 허용
   *
   * @example ['status', 'createdAt', 'author.name']
   * @default undefined (모든 필터 허용)
   */
  allowedFilters?: string[];

  /**
   * 허용된 정렬 필드 목록
   *
   * 정렬에 사용할 수 있는 필드를 명시적으로 지정합니다.
   * 성능을 위해 인덱스가 있는 필드만 허용하는 것을 권장합니다.
   *
   * - `undefined`: 모든 정렬 허용 (기본값)
   * - 빈 배열 `[]`: 모든 정렬 비활성화
   * - 문자열 배열: 해당 필드만 정렬 허용
   *
   * @example ['createdAt', 'updatedAt', 'title']
   * @default undefined (모든 정렬 허용)
   */
  allowedSorts?: string[];

  /**
   * 허용된 include 관계 목록
   *
   * 포함할 수 있는 관계를 명시적으로 지정합니다.
   * 성능과 보안을 위해 필요한 관계만 허용하는 것을 권장합니다.
   *
   * - `undefined`: 모든 include 허용 (기본값)
   * - 빈 배열 `[]`: 모든 include 비활성화
   * - 문자열 배열: 해당 관계만 include 허용
   *
   * 부모 관계가 허용되면 자식 관계도 허용됩니다.
   * 예: 'author' 허용 시 'author.profile' 도 허용
   *
   * @example ['author', 'comments', 'tags']
   * @default undefined (모든 include 허용)
   */
  allowedIncludes?: string[];

  /**
   * include 최대 중첩 깊이
   *
   * 관계 포함의 최대 중첩 수준을 제한합니다.
   * 깊은 중첩은 N+1 쿼리 문제를 유발할 수 있으므로 제한을 권장합니다.
   *
   * - `undefined`: 무제한 (기본값, 주의 필요)
   * - `1`: 직접 관계만 허용 (예: 'author')
   * - `2`: 1단계 중첩 허용 (예: 'author.profile')
   * - `n`: n-1단계 중첩 허용
   *
   * @example 2
   * @default undefined (무제한)
   */
  maxIncludeDepth?: number;

  /**
   * 허용된 sparse fieldsets 필드 목록 (타입별)
   *
   * 각 리소스 타입별로 반환 가능한 필드를 제한합니다.
   * 민감한 정보가 포함된 필드를 숨기는데 사용합니다.
   *
   * - `undefined`: 모든 필드 허용 (기본값)
   * - 타입별 필드 배열: 해당 필드만 선택 허용
   *
   * @example { articles: ['title', 'content'], users: ['name', 'email'] }
   * @default undefined (모든 필드 허용)
   */
  allowedFields?: Record<string, string[]>;

  /**
   * 허용되지 않은 쿼리 파라미터 처리 방식
   *
   * 화이트리스트에 없는 쿼리 파라미터가 요청되었을 때의 동작을 지정합니다.
   *
   * - `'ignore'`: 무시하고 진행 (기본값, 하위 호환)
   * - `'error'`: 400 Bad Request 에러 반환
   *
   * 보안이 중요한 API에서는 'error' 모드를 권장합니다.
   *
   * @example 'error'
   * @default 'ignore'
   */
  onDisallowed?: 'ignore' | 'error';
}

/**
 * 쿼리 화이트리스트 검증 결과
 *
 * parseWithWhitelist 메서드의 반환 타입으로,
 * 검증된 파싱 결과와 함께 경고/에러 메시지를 포함합니다.
 *
 * @example
 * ```typescript
 * const result = queryService.parseWithWhitelist(request, whitelist);
 *
 * if (result.errors.length > 0) {
 *   throw new BadRequestException({ errors: result.errors });
 * }
 *
 * if (result.warnings.length > 0) {
 *   console.warn('무시된 쿼리 파라미터:', result.warnings);
 * }
 *
 * // result.parsed를 사용하여 쿼리 실행
 * ```
 */
export interface QueryValidationResult {
  /**
   * 화이트리스트가 적용된 파싱 결과
   *
   * 허용되지 않은 필터/정렬/include/fields가 제거된 상태입니다.
   */
  parsed: import('./filter.interface').ParsedQuery;

  /**
   * 무시된 쿼리 파라미터 경고 메시지 목록
   *
   * onDisallowed: 'ignore' 모드에서 허용되지 않은 파라미터가
   * 요청되었을 때 해당 정보를 담습니다.
   * 로깅이나 디버깅 용도로 활용할 수 있습니다.
   *
   * @example ["Filter field 'password' is not allowed"]
   */
  warnings: string[];

  /**
   * 에러 메시지 목록
   *
   * onDisallowed: 'error' 모드에서 허용되지 않은 파라미터가
   * 요청되었을 때 해당 정보를 담습니다.
   * 에러가 있으면 400 응답을 반환해야 합니다.
   *
   * @example ["Filter field 'password' is not allowed"]
   */
  errors: string[];
}
