import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const mockHealthService = {
    check: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return { status: "ok" } when database is healthy', async () => {
      mockHealthService.check.mockResolvedValue({ status: 'ok' });

      await expect(controller.getHealth()).resolves.toEqual({ status: 'ok' });
      expect(mockHealthService.check).toHaveBeenCalledTimes(1);
    });

    it('should propagate ServiceUnavailableException when database is unreachable', async () => {
      mockHealthService.check.mockRejectedValue(
        new ServiceUnavailableException({
          status: 'error',
          message: 'Database connection failed',
        }),
      );

      await expect(controller.getHealth()).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(mockHealthService.check).toHaveBeenCalledTimes(1);
    });
  });
});

