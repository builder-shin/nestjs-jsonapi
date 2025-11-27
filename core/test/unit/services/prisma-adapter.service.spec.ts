import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAdapterService } from '../../../src/services/prisma-adapter.service';
import { PRISMA_SERVICE_TOKEN } from '../../../src/constants';

describe('PrismaAdapterService', () => {
  let service: PrismaAdapterService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      article: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaAdapterService,
        {
          provide: PRISMA_SERVICE_TOKEN,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PrismaAdapterService>(PrismaAdapterService);
  });

  describe('findMany', () => {
    it('should call prisma findMany with correct options', async () => {
      const mockData = [
        { id: '1', title: 'Article 1' },
        { id: '2', title: 'Article 2' },
      ];
      mockPrisma.article.findMany.mockResolvedValue(mockData);

      const result = await service.findMany('article', {
        where: { status: 'published' },
        orderBy: [{ createdAt: 'desc' }],
        skip: 0,
        take: 10,
      });

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
        where: { status: 'published' },
        orderBy: [{ createdAt: 'desc' }],
        skip: 0,
        take: 10,
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('findOne', () => {
    it('should call prisma findUnique with correct options', async () => {
      const mockData = { id: '1', title: 'Article 1' };
      mockPrisma.article.findUnique.mockResolvedValue(mockData);

      const result = await service.findOne('article', {
        where: { id: '1' },
      });

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(mockData);
    });

    it('should return null when record not found', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      const result = await service.findOne('article', {
        where: { id: 'non-existent' },
      });

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should call prisma create with correct data', async () => {
      const mockData = { id: '1', title: 'New Article', content: 'Content' };
      mockPrisma.article.create.mockResolvedValue(mockData);

      // 서비스의 create 메서드 시그니처: create(model, data, include?)
      // data 파라미터는 직접 데이터 객체 (Prisma의 data 필드에 들어갈 내용)
      const result = await service.create('article', {
        title: 'New Article',
        content: 'Content',
      });

      expect(mockPrisma.article.create).toHaveBeenCalledWith({
        data: { title: 'New Article', content: 'Content' },
        include: undefined,
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('update', () => {
    it('should call prisma update with correct data', async () => {
      const mockData = { id: '1', title: 'Updated Title' };
      mockPrisma.article.update.mockResolvedValue(mockData);

      // 서비스의 update 메서드 시그니처: update(model, where, data, include?)
      const result = await service.update(
        'article',
        { id: '1' },
        { title: 'Updated Title' },
      );

      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'Updated Title' },
        include: undefined,
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('delete', () => {
    it('should call prisma delete with correct where clause', async () => {
      const mockData = { id: '1', title: 'Deleted Article' };
      mockPrisma.article.delete.mockResolvedValue(mockData);

      // 서비스의 delete 메서드 시그니처: delete(model, where)
      const result = await service.delete('article', { id: '1' });

      expect(mockPrisma.article.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('count', () => {
    it('should call prisma count with correct where clause', async () => {
      mockPrisma.article.count.mockResolvedValue(42);

      const result = await service.count('article', { status: 'published' });

      expect(mockPrisma.article.count).toHaveBeenCalledWith({
        where: { status: 'published' },
      });
      expect(result).toBe(42);
    });
  });

  describe('transaction', () => {
    it('should execute callback within transaction', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      const result = await service.transaction(callback);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe('result');
    });
  });
});
