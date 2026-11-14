import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  const mockDataSource = {
    query: jest.fn(),
  };

  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GIT_SHA;
    delete process.env.RENDER_GIT_COMMIT;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('check', () => {
    it('should return { status: "ok" } when database query succeeds without GIT_SHA', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      await expect(service.check()).resolves.toEqual({ status: 'ok' });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return { status: "ok", commit: "sha-1234567" } when GIT_SHA is configured', async () => {
      process.env.GIT_SHA = 'sha-1234567';
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      await expect(service.check()).resolves.toEqual({
        status: 'ok',
        commit: 'sha-1234567',
      });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw ServiceUnavailableException when database query fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('connection refused'));

      await expect(service.check()).rejects.toThrow(ServiceUnavailableException);
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });
  });
});
