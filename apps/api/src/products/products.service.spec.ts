import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { InventoryService } from '../inventory/inventory.service';

// API-T12: GET /products trả thêm stock; availability theo lựa chọn và theo giỏ
describe('ProductsService', () => {
  let service: ProductsService;

  const mockProducts: Product[] = [
    { id: 'p1', name: 'Americano', price: 30000, imageUrl: '/images/americano.jpg' },
    { id: 'p2', name: 'Bạc xỉu', price: 32000, imageUrl: '/images/bac-xiu.jpg' },
  ];

  const mockRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
  };

  const mockInventory = {
    getSellableCups: jest.fn(),
    getAvailability: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockRepository.find.mockResolvedValue(mockProducts);
    mockRepository.findOneBy.mockImplementation(({ id }: { id: string }) =>
      Promise.resolve(mockProducts.find((p) => p.id === id) ?? null),
    );
    mockRepository.findBy.mockImplementation(() =>
      Promise.resolve(mockProducts),
    );
    mockInventory.getSellableCups.mockResolvedValue(new Map([['p1', 12]]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockRepository },
        { provide: InventoryService, useValue: mockInventory },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('trả danh sách kèm stock tính từ nguyên liệu; món không có công thức thì stock = 0', async () => {
      const result = await service.findAll();

      expect(result).toEqual([
        { ...mockProducts[0], stock: 12 },
        { ...mockProducts[1], stock: 0 },
      ]);
      expect(mockRepository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
      expect(mockInventory.getSellableCups).toHaveBeenCalledWith(['p1', 'p2']);
    });
  });

  describe('findById', () => {
    it('trả món kèm stock', async () => {
      await expect(service.findById('p1')).resolves.toEqual({
        ...mockProducts[0],
        stock: 12,
      });
      expect(mockInventory.getSellableCups).toHaveBeenCalledWith(['p1']);
    });

    it('trả null khi không có món, không gọi kho', async () => {
      await expect(service.findById('invalid')).resolves.toBeNull();
      expect(mockInventory.getSellableCups).not.toHaveBeenCalled();
    });
  });

  describe('getCartAvailability', () => {
    const lines = [
      { productId: 'p1', size: 'M' as const, toppingIds: ['cream' as const], qty: 2 },
      { productId: 'p2', size: 'S' as const, toppingIds: [], qty: 1 },
      { productId: 'p1', size: 'S' as const, toppingIds: [], qty: 1 },
    ];

    it('chuyển cả giỏ cho kho tính số ly còn bán', async () => {
      const response = {
        available: true,
        items: lines.map((line) => ({ ...line, stock: 5 })),
      };
      mockInventory.getAvailability.mockResolvedValue(response);

      await expect(service.getCartAvailability(lines)).resolves.toBe(response);
      expect(mockInventory.getAvailability).toHaveBeenCalledWith(lines);
    });

    it('báo 404 khi giỏ có món không tồn tại', async () => {
      mockRepository.findBy.mockResolvedValue([mockProducts[0]]);
      const withUnknown = [
        ...lines,
        { productId: 'p9', size: 'S' as const, toppingIds: [], qty: 1 },
      ];

      await expect(service.getCartAvailability(withUnknown)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockInventory.getAvailability).not.toHaveBeenCalled();
    });
  });

  describe('getSelectionAvailability', () => {
    it('tính số ly cho đúng 1 lựa chọn size/topping', async () => {
      mockRepository.findBy.mockResolvedValue([mockProducts[0]]);
      mockInventory.getAvailability.mockResolvedValue({
        available: true,
        items: [
          { productId: 'p1', size: 'L', toppingIds: ['pearls'], qty: 1, stock: 7 },
        ],
      });

      await expect(
        service.getSelectionAvailability('p1', { size: 'L', toppingIds: ['pearls'] }),
      ).resolves.toEqual({
        productId: 'p1',
        size: 'L',
        toppingIds: ['pearls'],
        stock: 7,
      });
      expect(mockInventory.getAvailability).toHaveBeenCalledWith([
        { productId: 'p1', size: 'L', toppingIds: ['pearls'], qty: 1 },
      ]);
    });
  });
});
