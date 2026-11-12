import { Injectable, UnauthorizedException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { DataSource } from 'typeorm';
import { priceCartItems } from '../pricing/price-cart-items';
import { QuoteVoucherDto } from './dto/quote-voucher.dto';
import { VouchersService } from './vouchers.service';
import { User } from '../auth/user.entity';

/** Identity comes only from main's JwtStrategy, never from the quote DTO. */
@Injectable()
export class VoucherCartQuoteService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly vouchers: VouchersService,
  ) {}

  quote(dto: QuoteVoucherDto, verifiedUserId?: string) {
    return this.dataSource.transaction(async (manager) => {
      if (
        verifiedUserId &&
        (!isUUID(verifiedUserId) ||
          !(await manager.getRepository(User).existsBy({ id: verifiedUserId })))
      )
        throw new UnauthorizedException(
          'Tài khoản không còn hợp lệ, vui lòng đăng nhập lại.',
        );
      const { subtotal } = await priceCartItems(manager, dto.items);
      const [clock] = await manager.query<Array<{ now: Date }>>(
        'SELECT clock_timestamp() AS now',
      );
      return this.vouchers.quote(
        manager,
        subtotal,
        dto.voucherCode,
        new Date(clock.now),
        verifiedUserId,
      );
    });
  }
}
