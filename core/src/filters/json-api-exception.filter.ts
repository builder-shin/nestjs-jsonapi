/**
 * JSON:API Exception Filter
 *
 * Converts all exceptions to JSON:API Error format.
 *
 * @packageDocumentation
 * @module filters
 *
 * Dependencies: interfaces/json-api.interface.ts, exceptions/json-api-validation.exception.ts, utils/error.util.ts
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
 * JSON:API standard media type
 */
const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

/**
 * HTTP status code to title mapping
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
 * JSON:API Exception Filter
 *
 * Converts all exceptions to JSON:API 1.1 Error format:
 * - JsonApiValidationException: Uses already formatted errors
 * - HttpException: Extracts errors from response object
 * - General Error: Converts to 500 Internal Server Error
 *
 * @example
 * ```typescript
 * // Register as global filter
 * app.useGlobalFilters(new JsonApiExceptionFilter());
 *
 * // Use at controller level
 * @UseFilters(JsonApiExceptionFilter)
 * @Controller('articles')
 * export class ArticleController {}
 * ```
 */
@Catch()
export class JsonApiExceptionFilter implements ExceptionFilter {
  /**
   * Handle exception
   *
   * @param exception Thrown exception
   * @param host Arguments host
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errors: JsonApiError[] = [];

    if (exception instanceof JsonApiValidationException) {
      // JsonApiValidationException already has formatted errors
      status = HttpStatus.BAD_REQUEST;
      errors = exception.jsonApiErrors;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;

        // Already in JSON:API format
        if (Array.isArray(resp.errors)) {
          errors = resp.errors;
        }
        // Handle class-validator errors (from ValidationPipe)
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
   * Get title corresponding to HTTP status code
   *
   * @param status HTTP status code
   * @returns Status title
   */
  private getHttpStatusTitle(status: number): string {
    return HTTP_STATUS_TITLES[status] || 'Error';
  }
}
