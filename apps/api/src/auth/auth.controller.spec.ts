import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({
      id: 'uuid-1',
      email: 'test@brewlite.com',
      loyaltyPoints: 0,
      role: 'CUSTOMER',
    }),
    login: jest.fn().mockResolvedValue({
      access_token: 'mock-jwt-token',
      user: {
        id: 'uuid-1',
        email: 'test@brewlite.com',
        loyaltyPoints: 0,
        role: 'CUSTOMER',
      },
    }),
    getProfile: jest.fn().mockResolvedValue({
      id: 'uuid-1',
      email: 'test@brewlite.com',
      loyaltyPoints: 0,
      role: 'CUSTOMER',
    }),
    findAllUsers: jest.fn().mockResolvedValue([
      {
        id: 'uuid-1',
        email: 'test@brewlite.com',
        loyaltyPoints: 0,
        role: 'CUSTOMER',
        createdAt: new Date(),
      },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register calls authService.register', async () => {
    const dto = { email: 'test@brewlite.com', password: 'password123' };
    const res = await controller.register(dto);
    expect(res.email).toBe('test@brewlite.com');
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('login calls authService.login', async () => {
    const dto = { email: 'test@brewlite.com', password: 'password123' };
    const res = await controller.login(dto);
    expect(res.access_token).toBe('mock-jwt-token');
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
  });

  it('getProfile calls authService.getProfile with userId', async () => {
    const req = {
      user: { userId: 'uuid-1', email: 'test@brewlite.com', role: 'CUSTOMER' as const },
    };
    const res = await controller.getProfile(req);
    expect(res.id).toBe('uuid-1');
    expect(mockAuthService.getProfile).toHaveBeenCalledWith('uuid-1');
  });

  it('getAllUsers calls authService.findAllUsers', async () => {
    const res = await controller.getAllUsers();
    expect(res).toHaveLength(1);
    expect(mockAuthService.findAllUsers).toHaveBeenCalled();
  });
});

