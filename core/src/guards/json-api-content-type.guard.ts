/**
 * JSON:API Content-Type 검증 가드
 *
 * JSON:API 1.1 스펙에 따라 요청의 Content-Type 헤더를 검증합니다.
 *
 * @packageDocumentation
 * @module guards
 *
 * 의존성: 없음
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * JSON:API 표준 미디어 타입
 */
const JSON_API_MEDIA_TYPE = 'application/vnd.api+json';

/**
 * JSON:API Content-Type 검증 가드
 *
 * JSON:API 1.1 스펙에 따라:
 * - 요청의 Content-Type이 application/vnd.api+json이어야 함
 * - Content-Type에 허용되지 않는 미디어 타입 파라미터가 포함되면 안됨 (charset 제외)
 *
 * @example
 * ```typescript
 * // 전역 가드로 등록
 * app.useGlobalGuards(new JsonApiContentTypeGuard());
 *
 * // 컨트롤러 레벨에서 사용
 * @UseGuards(JsonApiContentTypeGuard)
 * @Controller('articles')
 * export class ArticleController {}
 *
 * // 특정 엔드포인트에서만 사용
 * @UseGuards(JsonApiContentTypeGuard)
 * @Post()
 * create(@Body() data: CreateArticleDto) {}
 * ```
 */
@Injectable()
export class JsonApiContentTypeGuard implements CanActivate {
  /**
   * 가드 실행
   *
   * @param context 실행 컨텍스트
   * @returns true if Content-Type이 유효한 경우
   * @throws UnsupportedMediaTypeException - Content-Type이 유효하지 않은 경우
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // body가 없는 HTTP 메서드는 Content-Type 검증 스킵
    // - GET: 리소스 조회 (body 없음)
    // - HEAD: GET과 동일하나 body 없이 헤더만 반환
    // - DELETE: 리소스 삭제 (일반적으로 body 없음)
    // - OPTIONS: CORS preflight 등 (body 없음)
    const methodsWithoutBody = ['GET', 'HEAD', 'DELETE', 'OPTIONS'];
    if (methodsWithoutBody.includes(method)) {
      return true;
    }

    const contentType = request.headers['content-type'];

    // Content-Type 헤더가 없는 경우
    if (!contentType) {
      // body가 있는 경우에만 에러
      if (request.body && Object.keys(request.body).length > 0) {
        throw new UnsupportedMediaTypeException({
          errors: [
            {
              status: '415',
              title: 'Unsupported Media Type',
              detail: `Content-Type 헤더가 필요합니다. '${JSON_API_MEDIA_TYPE}'을 사용하세요.`,
            },
          ],
        });
      }
      return true;
    }

    // Content-Type 파싱 및 검증
    const isValid = this.validateContentType(contentType);

    if (!isValid) {
      throw new UnsupportedMediaTypeException({
        errors: [
          {
            status: '415',
            title: 'Unsupported Media Type',
            detail: `Content-Type은 '${JSON_API_MEDIA_TYPE}'이어야 합니다. 받은 값: '${contentType}'`,
          },
        ],
      });
    }

    return true;
  }

  /**
   * Content-Type 헤더 검증
   *
   * - application/vnd.api+json이어야 함
   * - 허용되지 않는 미디어 타입 파라미터가 없어야 함
   *
   * @param contentType Content-Type 헤더 값
   * @returns 유효 여부
   */
  private validateContentType(contentType: string): boolean {
    // 미디어 타입과 파라미터 분리
    const [mediaType, ...params] = contentType.split(';').map((s) => s.trim());

    // 기본 미디어 타입 확인
    if (mediaType.toLowerCase() !== JSON_API_MEDIA_TYPE) {
      return false;
    }

    // 허용된 파라미터: charset만 허용
    for (const param of params) {
      const [key] = param.split('=').map((s) => s.trim().toLowerCase());

      // charset은 허용
      if (key === 'charset') {
        continue;
      }

      // 그 외 파라미터는 JSON:API 스펙에서 허용되지 않음
      // 예: application/vnd.api+json; profile=... 는 거부
      return false;
    }

    return true;
  }
}
