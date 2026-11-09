import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProducts = [
    { id: 'p1', name: 'Americano', price: 30000, imageUrl: '/images/americano.jpg' },
  ];

  const mockProductsService = {
    findAll: jest.fn().mockResolvedValue(mockProducts),
    findById: jest.fn().mockImplementation((id) => {
      const found = mockProducts.find((p) => p.id === id);
      return Promise.resolve(found || null);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllProducts', () => {
    it('should return an array of products', async () => {
      expect(await controller.getAllProducts()).toEqual(mockProducts);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('getProductById', () => {
    it('should return a product by id', async () => {
      expect(await controller.getProductById('p1')).toEqual(mockProducts[0]);
      expect(service.findById).toHaveBeenCalledWith('p1');
    });

    it('should throw NotFoundException if product does not exist', async () => {
      await expect(controller.getProductById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});