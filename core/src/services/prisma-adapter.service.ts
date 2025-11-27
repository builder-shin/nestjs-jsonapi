/**
 * Prisma 어댑터 서비스
 *
 * @packageDocumentation
 * @module services
 *
 * 의존성: constants/metadata.constants.ts, exceptions/json-api-validation.exception.ts
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { PRISMA_SERVICE_TOKEN } from '../constants';
import { isPrismaError, handlePrismaError } from '../exceptions';

/**
 * findMany 옵션 인터페이스
 */
export interface FindManyOptions {
  /** WHERE 조건 */
  where?: Record<string, unknown>;
  /** 관계 포함 설정 */
  include?: Record<string, boolean | object>;
  /** 정렬 설정 */
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  /** 건너뛸 레코드 수 */
  skip?: number;
  /** 가져올 레코드 수 */
  take?: number;
  /** 필드 선택 */
  select?: Record<string, boolean>;
}

/**
 * findOne 옵션 인터페이스
 */
export interface FindOneOptions {
  /** WHERE 조건 (필수) */
  where: Record<string, unknown>;
  /** 관계 포함 설정 */
  include?: Record<string, boolean | object>;
  /** 필드 선택 */
  select?: Record<string, boolean>;
}

/**
 * Prisma 어댑터 서비스
 *
 * Prisma Client와 상호작용하는 추상화 레이어입니다.
 * 모든 CRUD 작업에서 Prisma 에러를 JSON:API 형식으로 변환합니다.
 *
 * @remarks
 * 이 서비스는 JSON_API_MODULE_OPTIONS를 직접 사용하지 않습니다.
 * 모듈 옵션(idType 등)은 컨트롤러 레벨에서 처리됩니다.
 *
 * @example
 * ```typescript
 * // 의존성 주입을 통한 사용
 * @Injectable()
 * class MyService {
 *   constructor(private readonly prismaAdapter: PrismaAdapterService) {}
 *
 *   async getUsers() {
 *     return this.prismaAdapter.findMany('user', { where: { active: true } });
 *   }
 * }
 * ```
 */
@Injectable()
export class PrismaAdapterService {
  constructor(
    @Optional()
    @Inject(PRISMA_SERVICE_TOKEN)
    private prisma?: any,
  ) {}

  /**
   * Prisma 클라이언트 설정 (동적 주입용)
   *
   * @param prisma Prisma Client 인스턴스
   */
  setPrismaClient(prisma: any): void {
    this.prisma = prisma;
  }

  /**
   * 여러 레코드 조회
   *
   * @template T 반환 타입
   * @param model Prisma 모델명 (소문자)
   * @param options 조회 옵션
   * @returns 조회된 레코드 배열
   */
  async findMany<T = any>(
    model: string,
    options: FindManyOptions = {},
  ): Promise<T[]> {
    const delegate = this.getModelDelegate(model);
    return delegate.findMany(options);
  }

  /**
   * 단일 레코드 조회 (고유 키 기반)
   *
   * @template T 반환 타입
   * @param model Prisma 모델명 (소문자)
   * @param options 조회 옵션 (where 필수)
   * @returns 조회된 레코드 또는 null
   */
  async findOne<T = any>(
    model: string,
    options: FindOneOptions,
  ): Promise<T | null> {
    const delegate = this.getModelDelegate(model);
    return delegate.findUnique(options);
  }

  /**
   * 조건에 맞는 첫 번째 레코드 조회
   *
   * @template T 반환 타입
   * @param model Prisma 모델명 (소문자)
   * @param options 조회 옵션
   * @returns 조회된 레코드 또는 null
   */
  async findFirst<T = any>(
    model: string,
    options: FindManyOptions = {},
  ): Promise<T | null> {
    const delegate = this.getModelDelegate(model);
    return delegate.findFirst(options);
  }

  /**
   * 레코드 개수 조회
   *
   * @param model Prisma 모델명 (소문자)
   * @param where WHERE 조건
   * @returns 레코드 개수
   */
  async count(model: string, where?: Record<string, unknown>): Promise<number> {
    const delegate = this.getModelDelegate(model);
    return delegate.count({ where });
  }

  /**
   * 단일 레코드 생성
   *
   * @template T 반환 타입
   * @param model Prisma 모델명 (소문자)
   * @param data 생성할 데이터
   * @param include 관계 포함 설정
   * @returns 생성된 레코드
   * @throws Prisma 에러 발생 시 JSON:API 형식 예외
   */
  async create<T = any>(
    model: string,
    data: Record<string, unknown>,
    include?: Record<string, boolean | object>,
  ): Promise<T> {
    try {
      const delegate = this.getModelDelegate(model);
      return await delegate.create({ data, include });
    } catch (error) {
      if (isPrismaError(error)) {
        handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * 여러 레코드 생성
   *
   * @param model Prisma 모델명 (소문자)
   * @param data 생성할 데이터 배열
   * @returns 생성된 레코드 수
   * @throws Prisma 에러 발생 시 JSON:API 형식 예외
   */
  async createMany(
    model: string,
    data: Record<string, unknown>[],
  ): Promise<{ count: number }> {
    try {
      const delegate = this.getModelDelegate(model);
      return await delegate.createMany({ data, skipDuplicates: false });
    } catch (error) {
      if (isPrismaError(error)) {
        handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * 여러 레코드 생성 후 조회 (트랜잭션)
   *
   * @remarks
   * - Prisma 5.14.0+ 에서 createManyAndReturn 네이티브 지원
   * - 이전 버전에서는 트랜잭션 컨텍스트 내에서 개별 생성 후 반환
   *
   * @performance
   * Fallback 동작 시 interactive transaction을 사용하여
   * 트랜잭션 격리를 보장합니다. 트랜잭션 컨텍스트(tx) 내에서
   * 모든 create 작업이 순차적으로 실행되며, 하나라도 실패하면
   * 전체가 롤백됩니다.
   *
   * @template T 반환 타입
   * @param model Prisma 모델명 (소문자)
   * @param data 생성할 데이터 배열
   * @param include 관계 포함 설정
   * @returns 생성된 레코드 배열
   * @throws Prisma 에러 발생 시 JSON:API 형식 예외
   */
  async createManyAndReturn<T = any>(
    model: string,
    data: Record<string, unknown>[],
    include?: Record<string, boolean | object>,
  ): Promise<T[]> {
    try {
      const delegate = this.getModelDelegate(model);

      // Prisma 5.14.0+ 에서 createManyAndReturn 지원
      if (typeof delegate.createManyAndReturn === 'function') {
        return await delegate.createManyAndReturn({ data, include });
      }

      // Fallback: Interactive transaction으로 개별 생성
      // 트랜잭션 컨텍스트(tx) 내에서 모든 작업을 수행하여
      // 트랜잭션 격리를 보장합니다.
      return await this.prisma.$transaction(async (tx: any) => {
        const txDelegate = tx[model];
        const results: T[] = [];

        for (const item of data) {
          const created = await txDelegate.create({ data: item, include });
          results.push(created);
        }

        return results;
      });
    } catch (error) {
      if (isPrismaError(error)) {
        handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * 단일 레코드 업데이트
   *
   * @template T 반환 타입
   * @param model Prisma 모델명 (소문자)
   * @param where WHERE 조건
   * @param data 업데이트할 데이터
   * @param include 관계 포함 설정
   * @returns 업데이트된 레코드
   * @throws Prisma 에러 발생 시 JSON:API 형식 예외
   */
  async update<T = any>(
    model: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>,
    include?: Record<string, boolean | object>,
  ): Promise<T> {
    try {
      const delegate = this.getModelDelegate(model);
      return await delegate.update({ where, data, include });
    } catch (error) {
      if (isPrismaError(error)) {
        handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * 여러 레코드 업데이트
   *
   * @param model Prisma 모델명 (소문자)
   * @param where WHERE 조건
   * @param data 업데이트할 데이터
   * @returns 업데이트된 레코드 수
   * @throws Prisma 에러 발생 시 JSON:API 형식 예외
   */
  async updateMany(
    model: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<{ count: number }> {
    try {
      const delegate = this.getModelDelegate(model);
      return await delegate.updateMany({ where, data });
    } catch (error) {
      if (isPrismaError(error)) {
        handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * Upsert (존재하면 업데이트, 없으면 생성)
   *
   * @template T 반환 타입
   * @param model Prisma 모델명 (소문자)
   * @param where WHERE 조건
   * @param create 생성 시 데이터
   * @param update 업데이트 시 데이터
   * @param include 관계 포함 설정
   * @returns 생성 또는 업데이트된 레코드
   * @throws Prisma 에러 발생 시 JSON:API 형식 예외
   */
  async upsert<T = any>(
    model: string,
    where: Record<string, unknown>,
    create: Record<string, unknown>,
    update: Record<string, unknown>,
    include?: Record<string, boolean | object>,
  ): Promise<T> {
    try {
      const delegate = this.getModelDelegate(model);
      return await delegate.upsert({ where, create, update, include });
    } catch (error) {
      if (isPrismaError(error)) {
        handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * 단일 레코드 삭제
   *
   * @template T 반환 타입
   * @param model Prisma 모델명 (소문자)
   * @param where WHERE 조건
   * @returns 삭제된 레코드
   * @throws Prisma 에러 발생 시 JSON:API 형식 예외
   */
  async delete<T = any>(
    model: string,
    where: Record<string, unknown>,
  ): Promise<T> {
    try {
      const delegate = this.getModelDelegate(model);
      return await delegate.delete({ where });
    } catch (error) {
      if (isPrismaError(error)) {
        handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * 여러 레코드 삭제
   *
   * @param model Prisma 모델명 (소문자)
   * @param where WHERE 조건
   * @returns 삭제된 레코드 수
   * @throws Prisma 에러 발생 시 JSON:API 형식 예외
   */
  async deleteMany(
    model: string,
    where: Record<string, unknown>,
  ): Promise<{ count: number }> {
    try {
      const delegate = this.getModelDelegate(model);
      return await delegate.deleteMany({ where });
    } catch (error) {
      if (isPrismaError(error)) {
        handlePrismaError(error);
      }
      throw error;
    }
  }

  /**
   * 트랜잭션 실행
   *
   * @template T 반환 타입
   * @param fn 트랜잭션 콜백 함수
   * @returns 트랜잭션 결과
   */
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /**
   * Prisma 모델 delegate 획득
   *
   * @param model Prisma 모델명 (소문자)
   * @returns Prisma model delegate
   * @throws Prisma 클라이언트가 초기화되지 않았거나 모델이 없는 경우
   */
  private getModelDelegate(model: string): any {
    if (!this.prisma) {
      throw new Error(
        'Prisma client not initialized. ' +
          'Make sure to provide PRISMA_SERVICE or set prismaServiceToken in module options.',
      );
    }

    const delegate = this.prisma[model];
    if (!delegate) {
      throw new Error(
        `Prisma model "${model}" not found. Check your schema.prisma file.`,
      );
    }
    return delegate;
  }
}
