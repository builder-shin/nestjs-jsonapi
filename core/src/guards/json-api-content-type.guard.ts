/**
 * JSON:API Content-Type Validation Guard
 *
 * Validates request Content-Type header according to JSON:API 1.1 spec.
 *
 * @packageDocumentation
 * @module guards
 *
 * Dependencies: none
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * JSON:API standard media type
 */
const JSON_API_MEDIA_TYPE = 'application/vnd.api+json';

/**
 * JSON:API Content-Type Validation Guard
 *
 * According to JSON:API 1.1 spec:
 * - Request Content-Type must be application/vnd.api+json
 * - Content-Type must not contain disallowed media type parameters (except charset)
 *
 * @example
 * ```typescript
 * // Register as global guard
 * app.useGlobalGuards(new JsonApiContentTypeGuard());
 *
 * // Use at controller level
 * @UseGuards(JsonApiContentTypeGuard)
 * @Controller('articles')
 * export class ArticleController {}
 *
 * // Use only on specific endpoint
 * @UseGuards(JsonApiContentTypeGuard)
 * @Post()
 * create(@Body() data: CreateArticleDto) {}
 * ```
 */
@Injectable()
export class JsonApiContentTypeGuard implements CanActivate {
  /**
   * Execute guard
   *
   * @param context Execution context
   * @returns true if Content-Type is valid
   * @throws UnsupportedMediaTypeException - if Content-Type is invalid
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Skip Content-Type validation for HTTP methods without body
    // - GET: Resource retrieval (no body)
    // - HEAD: Same as GET but returns headers only without body
    // - DELETE: Resource deletion (typically no body)
    // - OPTIONS: CORS preflight, etc. (no body)
    const methodsWithoutBody = ['GET', 'HEAD', 'DELETE', 'OPTIONS'];
    if (methodsWithoutBody.includes(method)) {
      return true;
    }

    const contentType = request.headers['content-type'];

    // No Content-Type header
    if (!contentType) {
      // Error only if body exists
      if (request.body && Object.keys(request.body).length > 0) {
        throw new UnsupportedMediaTypeException({
          errors: [
            {
              status: '415',
              title: 'Unsupported Media Type',
              detail: `Content-Type header is required. Use '${JSON_API_MEDIA_TYPE}'.`,
            },
          ],
        });
      }
      return true;
    }

    // Parse and validate Content-Type
    const isValid = this.validateContentType(contentType);

    if (!isValid) {
      throw new UnsupportedMediaTypeException({
        errors: [
          {
            status: '415',
            title: 'Unsupported Media Type',
            detail: `Content-Type must be '${JSON_API_MEDIA_TYPE}'. Received: '${contentType}'`,
          },
        ],
      });
    }

    return true;
  }

  /**
   * Validate Content-Type header
   *
   * - Must be application/vnd.api+json
   * - Must not have disallowed media type parameters
   *
   * @param contentType Content-Type header value
   * @returns Validity status
   */
  private validateContentType(contentType: string): boolean {
    // Separate media type and parameters
    const [mediaType, ...params] = contentType.split(';').map((s) => s.trim());

    // Check base media type
    if (mediaType.toLowerCase() !== JSON_API_MEDIA_TYPE) {
      return false;
    }

    // Allowed parameters: only charset
    for (const param of params) {
      const [key] = param.split('=').map((s) => s.trim().toLowerCase());

      // charset is allowed
      if (key === 'charset') {
        continue;
      }

      // Other parameters are not allowed by JSON:API spec
      // e.g., application/vnd.api+json; profile=... is rejected
      return false;
    }

    return true;
  }
}
