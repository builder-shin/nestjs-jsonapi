/**
 * JSON:API 예외 필터
 *
 * 모든 예외를 JSON:API Error 형식으로 변환합니다.
 *
 * @packageDocumentation
 * @module filters
 *
 * 의존성: interfaces/json-api.interface.ts, exceptions/json-api-validation.exception.ts, utils/error.util.ts
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JsonApiErrorDocument, JsonApiError } from '../interfaces';
import { JsonApiValidationException } from '../exceptions';
import { generateErrorId } from '../utils';

/**
 * JSON:API 표준 미디어 타입
 */
const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

/**
 * HTTP 상태 코드에 대응하는 제목 매핑
 */
const HTTP_STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

/**
 * JSON:API 예외 필터
 *
 * 모든 예외를 JSON:API 1.1 Error 형식으로 변환합니다:
 * - JsonApiValidationException: 이미 형식화된 에러 사용
 * - HttpException: 응답 객체에서 에러 추출
 * - 일반 Error: 500 Internal Server Error로 변환
 *
 * @example
 * ```typescript
 * // 전역 필터로 등록
 * app.useGlobalFilters(new JsonApiExceptionFilter());
 *
 * // 컨트롤러 레벨에서 사용
 * @UseFilters(JsonApiExceptionFilter)
 * @Controller('articles')
 * export class ArticleController {}
 * ```
 */
@Catch()
export class JsonApiExceptionFilter implements ExceptionFilter {
  /**
   * 예외 처리
   *
   * @param exception 발생한 예외
   * @param host 인자 호스트
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errors: JsonApiError[] = [];

    if (exception instanceof JsonApiValidationException) {
      // JsonApiValidationException은 이미 형식화된 에러 보유
      status = HttpStatus.BAD_REQUEST;
      errors = exception.jsonApiErrors;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;

        // 이미 JSON:API 형식인 경우
        if (Array.isArray(resp.errors)) {
          errors = resp.errors;
        }
        // class-validator 에러 처리 (ValidationPipe에서 발생)
        else if (Array.isArray(resp.message)) {
          errors = resp.message.map((msg: string) => ({
            id: generateErrorId(),
            status: String(status),
            title: this.getHttpStatusTitle(status),
            detail: msg,
            source: {
              pointer: '/data/attributes',
            },
          }));
        } else {
          errors = [
            {
              id: generateErrorId(),
              status: String(status),
              title: this.getHttpStatusTitle(status),
              detail: resp.message || exception.message,
            },
          ];
        }
      } else {
        errors = [
          {
            id: generateErrorId(),
            status: String(status),
            title: this.getHttpStatusTitle(status),
            detail: String(exceptionResponse),
          },
        ];
      }
    } else if (exception instanceof Error) {
      errors = [
        {
          id: generateErrorId(),
          status: String(status),
          title: 'Internal Server Error',
          detail: exception.message,
        },
      ];
    } else {
      errors = [
        {
          id: generateErrorId(),
          status: String(status),
          title: 'Internal Server Error',
          detail: 'An unexpected error occurred',
        },
      ];
    }

    const errorDocument: JsonApiErrorDocument = {
      jsonapi: { version: '1.1' },
      errors,
    };

    response
      .status(status)
      .setHeader('Content-Type', JSON_API_CONTENT_TYPE)
      .json(errorDocument);
  }

  /**
   * HTTP 상태 코드에 대응하는 제목 반환
   *
   * @param status HTTP 상태 코드
   * @returns 상태 제목
   */
  private getHttpStatusTitle(status: number): string {
    return HTTP_STATUS_TITLES[status] || 'Error';
  }
}
