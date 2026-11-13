import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/user.entity';
import { BankLedgerModule } from '../mock-bank/bank-ledger.module';
import { Order } from '../orders/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentRequestKey } from './entities/payment-request-key.entity';
import { Payment } from './entities/payment.entity';
import { MockBankController } from './mock-bank.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Payment, PaymentRequestKey, Order, User]),
    OrdersModule,
    BankLedgerModule,
  ],
  controllers: [
    PaymentsController,
    AdminPaymentsController,
    MockBankController,
  ],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
