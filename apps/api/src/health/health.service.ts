import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok';
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Kiểm tra trạng thái API và kết nối tới PostgreSQL.
   * Trả về `{ status: 'ok' }` khi database sẵn sàng, ném 503 khi mất kết nối.
   */
  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database connection failed',
      });
    }
  }
}

