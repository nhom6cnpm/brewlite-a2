import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderExpiryService } from './order-expiry.service';
import { OrderHistoryService } from './order-history.service';
import { parsePaymentTimeoutMinutes } from './payment-timeout';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const req = {
  user: { userId: 'u-1', email: 'a@b.vn', role: 'CUSTOMER' as const },
};

async function errorsOf(body: unknown) {
  const errors = await validate(plainToInstance(CreateOrderDto, body));
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...e.children!.flatMap((c) =>
      c.children!.flatMap((cc) => Object.values(cc.constraints ?? {})),
    ),
  ]);
}

describe('API-T19 OrdersController, DTO và job hết hạn', () => {
  it('POST /orders truyền user, giỏ và Idempotency-Key cho service', async () => {
    const createOrder = jest.fn(async () => ({ orderId: 'ORD-1' }));
    const controller = new OrdersController(
      { createOrder } as unknown as OrdersService,
      {} as OrderHistoryService,
    );
    const dto = { items: [] } as unknown as CreateOrderDto;
    await controller.create(req, dto, 'key-1');
    expect(createOrder).toHaveBeenCalledWith('u-1', dto, 'key-1');
    await controller.create(req, dto, undefined);
    expect(createOrder).toHaveBeenLastCalledWith('u-1', dto, '');
  });

  it('GET /orders/me và /orders/:id chỉ đọc đơn của người đang đăng nhập', async () => {
    const history = {
      findMine: jest.fn(async () => []),
      findOwnById: jest.fn(async () => ({})),
    };
    const controller = new OrdersController(
      {} as OrdersService,
      history as unknown as OrderHistoryService,
    );
    await controller.mine(req);
    await controller.detail(req, 'ORD-1');
    expect(history.findMine).toHaveBeenCalledWith('u-1');
    expect(history.findOwnById).toHaveBeenCalledWith('u-1', 'ORD-1');
  });

  it('có mô tả Swagger (tag, JWT, header Idempotency-Key, DTO)', async () => {
    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: {} },
        { provide: OrderHistoryService, useValue: {} },
      ],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Test').addBearerAuth().build(),
      );
      const create = document.paths['/orders'].post!;
      expect(create.tags).toContain('Orders');
      expect(create.security).toContainEqual({ 'JWT-auth': [] });
      expect(create.parameters).toContainEqual(
        expect.objectContaining({
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
        }),
      );
      expect(Object.keys(create.responses)).toEqual(
        expect.arrayContaining(['201', '400', '401', '409']),
      );
      expect(document.paths['/orders/me'].get?.tags).toContain('Orders');
      expect(
        document.paths['/orders/{id}'].get?.responses['404'],
      ).toBeDefined();
      expect(document.components?.schemas?.CreateOrderDto).toBeDefined();
      expect(document.components?.schemas?.OrderItemDto).toBeDefined();
      expect(
        document.components?.schemas?.CreateOrderResponseDto,
      ).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it('giỏ hợp lệ qua validate', async () => {
    await expect(
      errorsOf({
        voucherCode: ' thu5k ',
        items: [{ productId: 'p1', size: 'M', toppingIds: ['cream'], qty: 2 }],
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    [{ items: [] }, 'Danh sách items không được để trống'],
    [
      { items: [{ productId: 'p1', size: 'XL', toppingIds: [], qty: 1 }] },
      'Size phải thuộc S, M hoặc L',
    ],
    [
      { items: [{ productId: 'p1', size: 'S', toppingIds: ['milk'], qty: 1 }] },
      'Topping không hợp lệ',
    ],
    [
      {
        items: [
          {
            productId: 'p1',
            size: 'S',
            toppingIds: ['cream', 'cream'],
            qty: 1,
          },
        ],
      },
      'Topping bị trùng',
    ],
    [
      { items: [{ productId: 'p1', size: 'S', toppingIds: [], qty: 0 }] },
      'Số lượng (qty) phải lớn hơn hoặc bằng 1',
    ],
    [
      { items: [{ productId: 'p1', size: 'S', toppingIds: [], qty: 100 }] },
      'Số lượng (qty) tối đa là 99',
    ],
    [
      {
        voucherCode: 'mã sai!',
        items: [{ productId: 'p1', size: 'S', toppingIds: [], qty: 1 }],
      },
      'Mã giảm giá phải có 1–32 ký tự chữ, số, dấu gạch ngang hoặc gạch dưới.',
    ],
  ])('giỏ sai bị chặn: %j', async (body, message) => {
    await expect(errorsOf(body)).resolves.toContain(message);
  });

  it('thời gian giữ đơn mặc định 15 phút, đọc được từ cấu hình', () => {
    expect(parsePaymentTimeoutMinutes(undefined)).toBe(15);
    expect(parsePaymentTimeoutMinutes('abc')).toBe(15);
    expect(parsePaymentTimeoutMinutes('0')).toBe(15);
    expect(parsePaymentTimeoutMinutes('5')).toBe(5);
  });

  it('job hết hạn không chạy chồng và vẫn chạy tiếp khi lỗi', async () => {
    let finish!: () => void;
    const expireUnpaidOrders = jest
      .fn()
      .mockImplementationOnce(
        () => new Promise<number>((resolve) => (finish = () => resolve(1))),
      )
      .mockRejectedValueOnce(new Error('db down'));
    const job = new OrderExpiryService({
      expireUnpaidOrders,
    } as unknown as OrdersService);
    const first = job.scan();
    const overlapping = job.scan();
    expect(expireUnpaidOrders).toHaveBeenCalledTimes(1);
    finish();
    await Promise.all([first, overlapping]);
    await expect(job.scan()).resolves.toBeUndefined();
    expect(expireUnpaidOrders).toHaveBeenCalledTimes(2);
  });
});
