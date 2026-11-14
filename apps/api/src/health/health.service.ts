import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok';
  commit?: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Kiểm tra trạng thái API và kết nối tới PostgreSQL.
   * Trả về `{ status: 'ok', commit?: string }` khi database sẵn sàng, ném 503 khi mất kết nối.
   */
  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      const commit = process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT;
      return {
        status: 'ok',
        ...(commit ? { commit } : {}),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database connection failed',
      });
    }
  }
}
