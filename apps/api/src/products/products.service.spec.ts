import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: Repository<Product>;

  const mockProducts: Product[] = [
    { id: 'p1', name: 'Americano', price: 30000, imageUrl: '/images/americano.jpg' },
    { id: 'p2', name: 'Bạc xỉu', price: 32000, imageUrl: '/images/bac-xiu.jpg' },
  ];

  const mockRepository = {
    find: jest.fn().mockResolvedValue(mockProducts),
    findOneBy: jest.fn().mockImplementation((query) => {
      const found = mockProducts.find((p) => p.id === query.id);
      return Promise.resolve(found || null);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repo = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const result = await service.findAll();
      expect(result).toEqual(mockProducts);
      expect(repo.find).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a product if found', async () => {
      const result = await service.findById('p1');
      expect(result).toEqual(mockProducts[0]);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'p1' });
    });

    it('should return null if product not found', async () => {
      const result = await service.findById('invalid');
      expect(result).toBeNull();
    });
  });
});