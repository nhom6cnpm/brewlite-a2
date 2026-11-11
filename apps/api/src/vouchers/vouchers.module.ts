import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './voucher.entity';
import { VouchersController } from './vouchers.controller';
import { VoucherCatalogService } from './voucher-catalog.service';
import { VouchersService } from './vouchers.service';
import { VoucherUsagesService } from './voucher-usages.service';
import { VoucherUsage } from './voucher-usage.entity';
import { VoucherUserQuota } from './voucher-user-quota.entity';
import { VoucherCartQuoteService } from './voucher-cart-quote.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, VoucherUsage, VoucherUserQuota]),
  ],
  controllers: [VouchersController],
  providers: [
    VoucherCatalogService,
    VouchersService,
    VoucherUsagesService,
    VoucherCartQuoteService,
  ],
  exports: [VouchersService, VoucherUsagesService],
})
export class VouchersModule {}
