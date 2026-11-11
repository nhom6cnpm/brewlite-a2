import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { priceCartItems } from '../pricing/price-cart-items';
import { QuoteVoucherDto } from './dto/quote-voucher.dto';
import { VouchersService } from './vouchers.service';

/** Guest quote only until JWT + account usage migrations are integrated. */
@Injectable()
export class VoucherCartQuoteService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly vouchers: VouchersService,
  ) {}

  quoteGuest(dto: QuoteVoucherDto) {
    return this.dataSource.transaction(async (manager) => {
      const { subtotal } = await priceCartItems(manager, dto.items);
      const [clock] = await manager.query<Array<{ now: Date }>>(
        'SELECT clock_timestamp() AS now',
      );
      return this.vouchers.quote(
        manager,
        subtotal,
        dto.voucherCode,
        new Date(clock.now),
      );
    });
  }
}
