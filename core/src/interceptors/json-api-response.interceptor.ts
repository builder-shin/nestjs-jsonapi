/**
 * JSON:API 응답 인터셉터
 *
 * Content-Type 헤더 설정 및 응답 형식 처리
 *
 * @packageDocumentation
 * @module interceptors
 *
 * 의존성: 없음
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

/**
 * JSON:API 표준 미디어 타입
 */
const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

/**
 * JSON:API 응답 인터셉터
 *
 * 모든 응답에 대해:
 * 1. Content-Type 헤더를 application/vnd.api+json으로 설정
 * 2. 204 No Content 응답의 경우 body를 제거
 *
 * @example
 * ```typescript
 * // 전역 인터셉터로 등록
 * app.useGlobalInterceptors(new JsonApiResponseInterceptor());
 *
 * // 컨트롤러 레벨에서 사용
 * @UseInterceptors(JsonApiResponseInterceptor)
 * @Controller('articles')
 * export class ArticleController {}
 * ```
 */
@Injectable()
export class JsonApiResponseInterceptor implements NestInterceptor {
  /**
   * 인터셉터 실행
   *
   * @param context 실행 컨텍스트
   * @param next 핸들러 체인
   * @returns 처리된 응답
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // JSON:API Content-Type 헤더 설정
        response.setHeader('Content-Type', JSON_API_CONTENT_TYPE);

        // 204 No Content인 경우 body 없이 반환
        if (response.statusCode === 204) {
          return;
        }

        return data;
      }),
    );
  }
}
