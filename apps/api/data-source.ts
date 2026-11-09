import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Product } from './src/products/product.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgresql://brewlite:brewlite@localhost:5432/brewlite',
  entities: [Product],
  migrations: ['src/migrations/*{.ts,.js}'],
});