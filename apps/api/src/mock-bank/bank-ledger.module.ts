import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminBankController } from './admin-bank.controller';
import { BankTransaction } from './bank-transaction.entity';
import { BankLedgerService } from './bank-ledger.service';

// No dependency on Orders/Payments, so both can import it without a cycle
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([BankTransaction])],
  controllers: [AdminBankController],
  providers: [BankLedgerService],
  exports: [BankLedgerService],
})
export class BankLedgerModule {}
