import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { Product } from './products/product.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url:
          configService.get<string>('DATABASE_URL') ??
          'postgresql://brewlite:brewlite@localhost:5432/brewlite',
        entities: [Product],
        // Migrations run automatically on app startup (also handles seed order)
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    HealthModule,
    ProductsModule,
  ],
})
export class AppModule {}