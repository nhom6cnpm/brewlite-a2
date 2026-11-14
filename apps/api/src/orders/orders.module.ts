import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/user.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { OrderBenefitsService } from './order-benefits.service';
import { OrderExpiryService } from './order-expiry.service';
import { OrderHistoryService } from './order-history.service';
import { OrderInventoryReservation } from './order-inventory-reservation.entity';
import { OrderItem } from './order-item.entity';
import { OrderRequestKey } from './order-request-key.entity';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Payment } from '../payments/entities/payment.entity';
import { BankLedgerModule } from '../mock-bank/bank-ledger.module';
import { CustomerOrderCancellationService } from './customer-order-cancellation.service';
import { CustomerOrderCancellationController } from './customer-order-cancellation.controller';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderInventoryReservation,
      OrderRequestKey,
      User,
      Payment,
    ]),
    InventoryModule,
    VouchersModule,
    BankLedgerModule,
  ],
  controllers: [OrdersController, CustomerOrderCancellationController],
  providers: [
    OrdersService,
    OrderExpiryService,
    OrderHistoryService,
    OrderBenefitsService,
    CustomerOrderCancellationService,
  ],
  // Payments (#34) call updateOrderStatus / registerPaymentHooks
  exports: [OrdersService],
})
export class OrdersModule {}
