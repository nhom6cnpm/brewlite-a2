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

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderInventoryReservation,
      OrderRequestKey,
      User,
    ]),
    InventoryModule,
    VouchersModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderExpiryService,
    OrderHistoryService,
    OrderBenefitsService,
  ],
  // Payments (#34) call updateOrderStatus / registerPaymentHooks
  exports: [OrdersService],
})
export class OrdersModule {}
