/**
 * ServerConfigAuthGuard 단위 테스트
 *
 * Server Config API 인증 Guard의 동작을 검증합니다.
 *
 * @packageDocumentation
 * @module guards/__tests__
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ServerConfigAuthGuard } from '../server-config-auth.guard';
import { JSON_API_MODULE_OPTIONS } from '../../constants';
import { JsonApiModuleOptions } from '../../interfaces';

describe('ServerConfigAuthGuard', () => {
  let guard: ServerConfigAuthGuard;

  /**
   * 테스트용 Guard 인스턴스 생성
   */
  const createGuard = async (
    moduleOptions: Partial<JsonApiModuleOptions>,
  ): Promise<ServerConfigAuthGuard> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerConfigAuthGuard,
        {
          provide: JSON_API_MODULE_OPTIONS,
          useValue: {
            pagination: { defaultLimit: 20, maxLimit: 100 },
            ...moduleOptions,
          },
        },
      ],
    }).compile();

    return module.get<ServerConfigAuthGuard>(ServerConfigAuthGuard);
  };

  /**
   * Mock ExecutionContext 생성
   */
  const createMockExecutionContext = (authHeader?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authHeader ? { authorization: authHeader } : {},
        }),
      }),
    } as ExecutionContext;
  };

  describe('비활성화 상태', () => {
    it('enabled=false 시 403 Forbidden 반환', async () => {
      guard = await createGuard({ serverConfig: { enabled: false } });
      const context = createMockExecutionContext('Bearer test-password');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Server Config API is disabled',
      );
    });

    it('serverConfig 미설정 시 403 Forbidden 반환', async () => {
      guard = await createGuard({});
      const context = createMockExecutionContext('Bearer test-password');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Server Config API is disabled',
      );
    });
  });

  describe('인증 헤더 검증', () => {
    it('Authorization 헤더 없음 시 401 반환', async () => {
      guard = await createGuard({
        serverConfig: { enabled: true, password: 'test-password' },
      });
      const context = createMockExecutionContext();

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Authorization header required',
      );
    });

    it('Bearer 접두사 없는 토큰 시 401 반환', async () => {
      guard = await createGuard({
        serverConfig: { enabled: true, password: 'test-password' },
      });
      const context = createMockExecutionContext('test-password');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Authorization header required',
      );
    });

    it('Basic 인증 형식 시 401 반환', async () => {
      guard = await createGuard({
        serverConfig: { enabled: true, password: 'test-password' },
      });
      const context = createMockExecutionContext('Basic dXNlcjpwYXNz');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Authorization header required',
      );
    });
  });

  describe('비밀번호 검증', () => {
    it('비밀번호 미설정 시 401 반환', async () => {
      guard = await createGuard({
        serverConfig: { enabled: true } as any,
      });
      const context = createMockExecutionContext('Bearer some-token');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Server config password not configured',
      );
    });

    it('빈 토큰으로 빈 비밀번호 우회 시도 시 401 반환', async () => {
      guard = await createGuard({
        serverConfig: { enabled: true } as any,
      });
      const context = createMockExecutionContext('Bearer ');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Server config password not configured',
      );
    });

    it('잘못된 비밀번호 시 401 반환', async () => {
      guard = await createGuard({
        serverConfig: { enabled: true, password: 'correct-password' },
      });
      const context = createMockExecutionContext('Bearer wrong-password');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid password');
    });

    it('길이만 다른 비밀번호 시 401 반환 (타이밍 공격 방지)', async () => {
      guard = await createGuard({
        serverConfig: { enabled: true, password: 'correct-password' },
      });
      const context = createMockExecutionContext('Bearer short');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid password');
    });
  });

  describe('인증 성공', () => {
    it('올바른 비밀번호 시 통과', async () => {
      guard = await createGuard({
        serverConfig: { enabled: true, password: 'test-password' },
      });
      const context = createMockExecutionContext('Bearer test-password');

      expect(guard.canActivate(context)).toBe(true);
    });

    it('특수문자 포함 비밀번호 시 통과', async () => {
      const specialPassword = 'p@ssw0rd!#$%^&*()';
      guard = await createGuard({
        serverConfig: { enabled: true, password: specialPassword },
      });
      const context = createMockExecutionContext(`Bearer ${specialPassword}`);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('긴 비밀번호 시 통과', async () => {
      const longPassword = 'a'.repeat(256);
      guard = await createGuard({
        serverConfig: { enabled: true, password: longPassword },
      });
      const context = createMockExecutionContext(`Bearer ${longPassword}`);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('UTF-8 문자 포함 비밀번호 시 통과', async () => {
      const utf8Password = '비밀번호テスト密码';
      guard = await createGuard({
        serverConfig: { enabled: true, password: utf8Password },
      });
      const context = createMockExecutionContext(`Bearer ${utf8Password}`);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('설정 옵션', () => {
    it('path 옵션과 무관하게 인증 수행', async () => {
      guard = await createGuard({
        serverConfig: {
          enabled: true,
          password: 'test-password',
          path: 'custom-path',
        },
      });
      const context = createMockExecutionContext('Bearer test-password');

      expect(guard.canActivate(context)).toBe(true);
    });

    it('detailLevel 옵션과 무관하게 인증 수행', async () => {
      guard = await createGuard({
        serverConfig: {
          enabled: true,
          password: 'test-password',
          detailLevel: 'full',
        },
      });
      const context = createMockExecutionContext('Bearer test-password');

      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
