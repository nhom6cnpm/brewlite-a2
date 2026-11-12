import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Product } from './src/products/product.entity';
import { User } from './src/auth/user.entity';
import { Voucher } from './src/vouchers/voucher.entity';
import { VoucherUsage } from './src/vouchers/voucher-usage.entity';
import { VoucherUserQuota } from './src/vouchers/voucher-user-quota.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgresql://brewlite:brewlite@localhost:5432/brewlite',
  entities: [Product, User, Voucher, VoucherUsage, VoucherUserQuota],
  migrations: ['src/migrations/*{.ts,.js}'],
});
