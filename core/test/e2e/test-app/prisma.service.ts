import { Injectable } from '@nestjs/common';

/**
 * Mock Prisma Service for E2E Testing
 *
 * A mock service for performing E2E tests without actual DB connection.
 * Stores model data used in tests in memory.
 */
@Injectable()
export class PrismaService {
  // In-memory data storage
  private data: Record<string, Record<string, any>[]> = {
    article: [],
  };

  // ID counter
  private idCounter = 1;

  /**
   * Initialize test data
   */
  constructor() {
    this.seedData();
  }

  /**
   * Seed data for testing
   */
  private seedData(): void {
    this.data.article = [
      {
        id: '1',
        title: 'First Article',
        content: 'Content 1',
        status: 'published',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        authorId: '1',
      },
      {
        id: '2',
        title: 'Second Article',
        content: 'Content 2',
        status: 'draft',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        authorId: '1',
      },
      {
        id: '3',
        title: 'Third Article',
        content: 'Content 3',
        status: 'published',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
        authorId: '2',
      },
    ];
    this.idCounter = 4;
  }

  /**
   * Reset data (test isolation)
   */
  resetData(): void {
    this.seedData();
  }

  /**
   * Returns a model delegate that behaves like Prisma Client
   */
  get article() {
    return this.createDelegate('article');
  }

  /**
   * Create delegate for each model
   */
  private createDelegate(model: string) {
    return {
      findMany: async (args?: any) => {
        let results = [...(this.data[model] || [])];

        // Apply where conditions
        if (args?.where) {
          results = results.filter((item) =>
            this.matchWhere(item, args.where),
          );
        }

        // Apply orderBy
        if (args?.orderBy) {
          results = this.applyOrderBy(results, args.orderBy);
        }

        // Apply skip/take (pagination)
        if (args?.skip !== undefined) {
          results = results.slice(args.skip);
        }
        if (args?.take !== undefined) {
          results = results.slice(0, args.take);
        }

        return results;
      },

      findUnique: async (args: any) => {
        const items = this.data[model] || [];
        return items.find((item) => this.matchWhere(item, args.where)) || null;
      },

      findFirst: async (args?: any) => {
        let results = [...(this.data[model] || [])];
        if (args?.where) {
          results = results.filter((item) =>
            this.matchWhere(item, args.where),
          );
        }
        return results[0] || null;
      },

      count: async (args?: any) => {
        let results = [...(this.data[model] || [])];
        if (args?.where) {
          results = results.filter((item) =>
            this.matchWhere(item, args.where),
          );
        }
        return results.length;
      },

      create: async (args: any) => {
        const newItem = {
          id: String(this.idCounter++),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        this.data[model] = this.data[model] || [];
        this.data[model].push(newItem);
        return newItem;
      },

      createMany: async (args: any) => {
        const items = args.data.map((item: any) => ({
          id: String(this.idCounter++),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...item,
        }));
        this.data[model] = this.data[model] || [];
        this.data[model].push(...items);
        return { count: items.length };
      },

      update: async (args: any) => {
        const items = this.data[model] || [];
        const index = items.findIndex((item) =>
          this.matchWhere(item, args.where),
        );
        if (index === -1) {
          throw new Error(`${model} not found`);
        }
        items[index] = {
          ...items[index],
          ...args.data,
          updatedAt: new Date(),
        };
        return items[index];
      },

      updateMany: async (args: any) => {
        let count = 0;
        const items = this.data[model] || [];
        items.forEach((item, index) => {
          if (this.matchWhere(item, args.where || {})) {
            items[index] = {
              ...item,
              ...args.data,
              updatedAt: new Date(),
            };
            count++;
          }
        });
        return { count };
      },

      upsert: async (args: any) => {
        const items = this.data[model] || [];
        const index = items.findIndex((item) =>
          this.matchWhere(item, args.where),
        );
        if (index === -1) {
          const newItem = {
            id: String(this.idCounter++),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...args.create,
          };
          this.data[model].push(newItem);
          return newItem;
        }
        items[index] = {
          ...items[index],
          ...args.update,
          updatedAt: new Date(),
        };
        return items[index];
      },

      delete: async (args: any) => {
        const items = this.data[model] || [];
        const index = items.findIndex((item) =>
          this.matchWhere(item, args.where),
        );
        if (index === -1) {
          throw new Error(`${model} not found`);
        }
        const deleted = items.splice(index, 1)[0];
        return deleted;
      },

      deleteMany: async (args: any) => {
        const items = this.data[model] || [];
        const toDelete = items.filter((item) =>
          this.matchWhere(item, args?.where || {}),
        );
        this.data[model] = items.filter(
          (item) => !this.matchWhere(item, args?.where || {}),
        );
        return { count: toDelete.length };
      },
    };
  }

  /**
   * Match where conditions
   */
  private matchWhere(item: any, where: any): boolean {
    if (!where || Object.keys(where).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;

      // Nested object (Prisma operators)
      if (typeof value === 'object' && value !== null) {
        const ops = value as Record<string, any>;

        if ('equals' in ops && item[key] !== ops.equals) return false;
        if ('not' in ops && item[key] === ops.not) return false;
        if ('in' in ops && !ops.in.includes(item[key])) return false;
        if ('notIn' in ops && ops.notIn.includes(item[key])) return false;
        if ('lt' in ops && !(item[key] < ops.lt)) return false;
        if ('lte' in ops && !(item[key] <= ops.lte)) return false;
        if ('gt' in ops && !(item[key] > ops.gt)) return false;
        if ('gte' in ops && !(item[key] >= ops.gte)) return false;
        if (
          'contains' in ops &&
          !String(item[key]).includes(String(ops.contains))
        )
          return false;
        if (
          'startsWith' in ops &&
          !String(item[key]).startsWith(String(ops.startsWith))
        )
          return false;
        if (
          'endsWith' in ops &&
          !String(item[key]).endsWith(String(ops.endsWith))
        )
          return false;
      } else {
        // Simple value comparison (equals)
        if (item[key] !== value) return false;
      }
    }

    return true;
  }

  /**
   * Apply orderBy
   */
  private applyOrderBy(items: any[], orderBy: any): any[] {
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];

    return [...items].sort((a, b) => {
      for (const order of orders) {
        for (const [field, direction] of Object.entries(order)) {
          const aVal = a[field];
          const bVal = b[field];

          if (aVal === bVal) continue;

          const comparison = aVal < bVal ? -1 : 1;
          return direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Transaction mock (simply executes callback)
   */
  async $transaction<T>(fn: (prisma: this) => Promise<T>): Promise<T> {
    return fn(this);
  }
}
