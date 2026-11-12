import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from './voucher.entity';

@Injectable()
export class VoucherCatalogService {
  constructor(
    @InjectRepository(Voucher) private readonly vouchers: Repository<Voucher>,
  ) {}

  /** Public catalogue only. Never returns account data or hidden codes. */
  async list() {
    return this.vouchers
      .createQueryBuilder('voucher')
      .where('voucher.isActive = true AND voucher.isPublic = true')
      .andWhere('voucher.endsAt > clock_timestamp()')
      .orderBy('voucher.code', 'ASC')
      .getMany();
  }
}
