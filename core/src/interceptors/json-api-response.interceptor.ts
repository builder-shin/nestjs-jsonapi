/**
 * JSON:API Response Interceptor
 *
 * Content-Type header setting and response format handling
 *
 * @packageDocumentation
 * @module interceptors
 *
 * Dependencies: none
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
 * JSON:API standard media type
 */
const JSON_API_CONTENT_TYPE = 'application/vnd.api+json';

/**
 * JSON:API Response Interceptor
 *
 * For all responses:
 * 1. Sets Content-Type header to application/vnd.api+json
 * 2. Removes body for 204 No Content responses
 *
 * @example
 * ```typescript
 * // Register as global interceptor
 * app.useGlobalInterceptors(new JsonApiResponseInterceptor());
 *
 * // Use at controller level
 * @UseInterceptors(JsonApiResponseInterceptor)
 * @Controller('articles')
 * export class ArticleController {}
 * ```
 */
@Injectable()
export class JsonApiResponseInterceptor implements NestInterceptor {
  /**
   * Execute interceptor
   *
   * @param context Execution context
   * @param next Handler chain
   * @returns Processed response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // Set JSON:API Content-Type header
        response.setHeader('Content-Type', JSON_API_CONTENT_TYPE);

        // Return without body for 204 No Content
        if (response.statusCode === 204) {
          return;
        }

        return data;
      }),
    );
  }
}
