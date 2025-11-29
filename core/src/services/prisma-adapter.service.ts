/**
 * Prisma adapter service
 *
 * @packageDocumentation
 * @module services
 *
 * Dependencies: constants/metadata.constants.ts, exceptions/json-api-validation.exception.ts
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { PRISMA_SERVICE_TOKEN } from '../constants';
import { isPrismaError, handlePrismaError } from '../exceptions';

/**
 * findMany options interface
 */
export interface FindManyOptions {
  /** WHERE condition */
  where?: Record<string, unknown>;
  /** Relationship include settings */
  include?: Record<string, boolean | object>;
  /** Sort settings */
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  /** Number of records to skip */
  skip?: number;
  /** Number of records to take */
  take?: number;
  /** Field selection */
  select?: Record<string, boolean>;
}

/**
 * findOne options interface
 */
export interface FindOneOptions {
  /** WHERE condition (required) */
  where: Record<string, unknown>;
  /** Relationship include settings */
  include?: Record<string, boolean | object>;
  /** Field selection */
  select?: Record<string, boolean>;
}

/**
 * Prisma adapter service
 *
 * Abstraction layer for interacting with Prisma Client.
 * Converts Prisma errors to JSON:API format for all CRUD operations.
 *
 * @remarks
 * This service does not directly use JSON_API_MODULE_OPTIONS.
 * Module options (idType, etc.) are handled at the controller level.
 *
 * @example
 * ```typescript
 * // Usage through dependency injection
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
   * Set Prisma client (for dynamic injection)
   *
   * @param prisma Prisma Client instance
   */
  setPrismaClient(prisma: any): void {
    this.prisma = prisma;
  }

  /**
   * Query multiple records
   *
   * @template T Return type
   * @param model Prisma model name (lowercase)
   * @param options Query options
   * @returns Array of queried records
   */
  async findMany<T = any>(
    model: string,
    options: FindManyOptions = {},
  ): Promise<T[]> {
    const delegate = this.getModelDelegate(model);
    return delegate.findMany(options);
  }

  /**
   * Query single record (by unique key)
   *
   * @template T Return type
   * @param model Prisma model name (lowercase)
   * @param options Query options (where required)
   * @returns Queried record or null
   */
  async findOne<T = any>(
    model: string,
    options: FindOneOptions,
  ): Promise<T | null> {
    const delegate = this.getModelDelegate(model);
    return delegate.findUnique(options);
  }

  /**
   * Query first record matching condition
   *
   * @template T Return type
   * @param model Prisma model name (lowercase)
   * @param options Query options
   * @returns Queried record or null
   */
  async findFirst<T = any>(
    model: string,
    options: FindManyOptions = {},
  ): Promise<T | null> {
    const delegate = this.getModelDelegate(model);
    return delegate.findFirst(options);
  }

  /**
   * Count records
   *
   * @param model Prisma model name (lowercase)
   * @param where WHERE condition
   * @returns Record count
   */
  async count(model: string, where?: Record<string, unknown>): Promise<number> {
    const delegate = this.getModelDelegate(model);
    return delegate.count({ where });
  }

  /**
   * Create single record
   *
   * @template T Return type
   * @param model Prisma model name (lowercase)
   * @param data Data to create
   * @param include Relationship include settings
   * @returns Created record
   * @throws JSON:API format exception on Prisma error
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
   * Create multiple records
   *
   * @param model Prisma model name (lowercase)
   * @param data Array of data to create
   * @returns Number of created records
   * @throws JSON:API format exception on Prisma error
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
   * Create multiple records and return them (transaction)
   *
   * @remarks
   * - Prisma 5.14.0+ natively supports createManyAndReturn
   * - For earlier versions, creates individually within transaction context and returns
   *
   * @performance
   * Fallback behavior uses interactive transaction to ensure
   * transaction isolation. All create operations execute sequentially
   * within transaction context (tx), and if any fails,
   * the entire operation is rolled back.
   *
   * @template T Return type
   * @param model Prisma model name (lowercase)
   * @param data Array of data to create
   * @param include Relationship include settings
   * @returns Array of created records
   * @throws JSON:API format exception on Prisma error
   */
  async createManyAndReturn<T = any>(
    model: string,
    data: Record<string, unknown>[],
    include?: Record<string, boolean | object>,
  ): Promise<T[]> {
    try {
      const delegate = this.getModelDelegate(model);

      // Prisma 5.14.0+ supports createManyAndReturn
      if (typeof delegate.createManyAndReturn === 'function') {
        return await delegate.createManyAndReturn({ data, include });
      }

      // Fallback: Create individually with interactive transaction
      // All operations are performed within transaction context (tx)
      // to ensure transaction isolation.
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
   * Update single record
   *
   * @template T Return type
   * @param model Prisma model name (lowercase)
   * @param where WHERE condition
   * @param data Data to update
   * @param include Relationship include settings
   * @returns Updated record
   * @throws JSON:API format exception on Prisma error
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
   * Update multiple records
   *
   * @param model Prisma model name (lowercase)
   * @param where WHERE condition
   * @param data Data to update
   * @returns Number of updated records
   * @throws JSON:API format exception on Prisma error
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
   * Upsert (update if exists, create if not)
   *
   * @template T Return type
   * @param model Prisma model name (lowercase)
   * @param where WHERE condition
   * @param create Data for creation
   * @param update Data for update
   * @param include Relationship include settings
   * @returns Created or updated record
   * @throws JSON:API format exception on Prisma error
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
   * Delete single record
   *
   * @template T Return type
   * @param model Prisma model name (lowercase)
   * @param where WHERE condition
   * @returns Deleted record
   * @throws JSON:API format exception on Prisma error
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
   * Delete multiple records
   *
   * @param model Prisma model name (lowercase)
   * @param where WHERE condition
   * @returns Number of deleted records
   * @throws JSON:API format exception on Prisma error
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
   * Execute transaction
   *
   * @template T Return type
   * @param fn Transaction callback function
   * @returns Transaction result
   */
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /**
   * Get Prisma model delegate
   *
   * @param model Prisma model name (lowercase)
   * @returns Prisma model delegate
   * @throws If Prisma client not initialized or model not found
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
