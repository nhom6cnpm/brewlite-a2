import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { User } from './user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsers: User[] = [];
  const jwtSign = jest.fn().mockReturnValue('mock_token');

  const mockUserRepository = {
    create: jest.fn().mockImplementation((dto) => ({
      id: Date.now().toString(),
      loyaltyPoints: 0,
      createdAt: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation(async (user: User) => {
      mockUsers.push(user);
      return user;
    }),
    findOneBy: jest
      .fn()
      .mockImplementation(
        async (query: {
          email?: string;
          id?: string;
        }): Promise<User | null> => {
          if (query.email) {
            return mockUsers.find((u) => u.email === query.email) ?? null;
          }
          if (query.id) {
            return mockUsers.find((u) => u.id === query.id) ?? null;
          }
          return null;
        },
      ),
    find: jest.fn().mockImplementation(async () => [...mockUsers]),
  };

  beforeEach(async () => {
    mockUsers = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jwtSign,
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user with loyaltyPoints = 0 and no password in output', async () => {
      const result = await service.register({
        email: 'test@brewlite.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('id');
      expect(result.email).toBe('test@brewlite.com');
      expect(result.loyaltyPoints).toBe(0);
      expect(result.role).toBe('CUSTOMER');
      expect((result as Record<string, unknown>).password).toBeUndefined();
      expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('should throw ConflictException (409) if email is already registered', async () => {
      await service.register({
        email: 'duplicate@brewlite.com',
        password: 'password123',
      });

      await expect(
        service.register({
          email: 'duplicate@brewlite.com',
          password: 'password456',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.register({
        email: 'user@brewlite.com',
        password: 'correctPassword',
      });
    });

    it('should return access_token and user info for valid credentials', async () => {
      const res = await service.login({
        email: 'user@brewlite.com',
        password: 'correctPassword',
      });

      expect(res).toHaveProperty('access_token', 'mock_token');
      expect(res.user.email).toBe('user@brewlite.com');
      expect(res.user.loyaltyPoints).toBe(0);
      expect(res.user.role).toBe('CUSTOMER');
    });

    it('puts the role into the JWT so RolesGuard can check it', async () => {
      mockUsers[0].role = 'ADMIN';
      const res = await service.login({
        email: 'user@brewlite.com',
        password: 'correctPassword',
      });
      expect(res.user.role).toBe('ADMIN');
      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' }),
      );
    });

    it('should throw UnauthorizedException (401) for incorrect password', async () => {
      await expect(
        service.login({
          email: 'user@brewlite.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException (401) for unregistered email', async () => {
      await expect(
        service.login({
          email: 'nonexistent@brewlite.com',
          password: 'anyPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('returns user profile for valid userId', async () => {
      const registered = await service.register({
        email: 'profile@brewlite.com',
        password: 'password123',
      });

      const profile = await service.getProfile(registered.id);
      expect(profile.id).toBe(registered.id);
      expect(profile.email).toBe('profile@brewlite.com');
      expect(profile.loyaltyPoints).toBe(0);
    });

    it('throws UnauthorizedException if user not found', async () => {
      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findAllUsers', () => {
    it('returns all registered users without passwordHash', async () => {
      await service.register({
        email: 'user1@brewlite.com',
        password: 'password123',
      });

      const list = await service.findAllUsers();
      expect(list.length).toBe(1);
      expect(list[0].email).toBe('user1@brewlite.com');
      expect((list[0] as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });
});

