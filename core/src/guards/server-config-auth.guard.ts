/**
 * Server Config API 인증 Guard
 *
 * Server Config API 엔드포인트에 대한 Bearer 토큰 인증을 수행합니다.
 * 타이밍 공격 방지를 위해 crypto.timingSafeEqual을 사용합니다.
 *
 * @packageDocumentation
 * @module guards
 *
 * Dependencies: crypto
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { JSON_API_MODULE_OPTIONS } from '../constants';
import { JsonApiModuleOptions } from '../interfaces';

/**
 * Server Config API 인증 Guard
 *
 * Server Config API 접근 시 인증을 수행합니다:
 * - enabled=false: 403 Forbidden
 * - 비밀번호 미설정/불일치: 401 Unauthorized
 *
 * 타이밍 공격 방지를 위해 crypto.timingSafeEqual을 사용합니다.
 *
 * @example
 * ```typescript
 * // 컨트롤러에서 사용
 * @UseGuards(ServerConfigAuthGuard)
 * @Controller('server-config')
 * export class ServerConfigController {}
 *
 * // 클라이언트 요청
 * fetch('/server-config', {
 *   headers: {
 *     'Authorization': 'Bearer your-secret-password'
 *   }
 * });
 * ```
 */
@Injectable()
export class ServerConfigAuthGuard implements CanActivate {
  constructor(
    @Inject(JSON_API_MODULE_OPTIONS)
    private readonly moduleOptions: JsonApiModuleOptions,
  ) {}

  /**
   * Guard 실행
   *
   * @param context 실행 컨텍스트
   * @returns 인증 성공 시 true
   * @throws ForbiddenException - Server Config API 비활성화 시
   * @throws UnauthorizedException - 인증 실패 시
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    const config = this.moduleOptions.serverConfig;

    // 비활성화 상태면 403 Forbidden 반환
    if (!config?.enabled) {
      throw new ForbiddenException('Server Config API is disabled');
    }

    // Bearer 토큰 검증
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header required');
    }

    const token = authHeader.slice(7);

    // 비밀번호 미설정 시 명확한 에러 반환 (빈 문자열 인증 우회 방지)
    if (!config.password) {
      throw new UnauthorizedException('Server config password not configured');
    }

    // 타이밍 공격 방지: timingSafeEqual 사용
    // 주의: timingSafeEqual은 길이가 다르면 에러를 던지므로 선행 길이 체크 필수
    // 길이 비교 자체는 상수 시간이 아니지만, 비밀번호 존재 여부만 노출하므로 보안상 수용 가능
    // (실제 비밀번호 내용은 노출되지 않음)
    const tokenBuffer = Buffer.from(token);
    const passwordBuffer = Buffer.from(config.password);

    if (
      tokenBuffer.length !== passwordBuffer.length ||
      !timingSafeEqual(tokenBuffer, passwordBuffer)
    ) {
      throw new UnauthorizedException('Invalid password');
    }

    return true;
  }
}
