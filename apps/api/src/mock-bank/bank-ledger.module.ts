import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankTransaction } from './bank-transaction.entity';
import { BankLedgerService } from './bank-ledger.service';

// No dependency on Orders/Payments, so both can import it without a cycle.
// The staff statement page (GET /admin/bank-transactions) belongs to #39.
@Module({
  imports: [TypeOrmModule.forFeature([BankTransaction])],
  providers: [BankLedgerService],
  exports: [BankLedgerService],
})
export class BankLedgerModule {}
