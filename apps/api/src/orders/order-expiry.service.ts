import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ORDER_EXPIRY_SCAN_INTERVAL_MS } from './order-expiry';

/**
 * Background job: every few seconds cancel unpaid orders past expiresAt
 * (default 15 minutes, ORDER_PAYMENT_TIMEOUT_MINUTES), giving back
 * ingredients and voucher uses. Scans never overlap.
 */
@Injectable()
export class OrderExpiryService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(OrderExpiryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running: Promise<void> | null = null;

  constructor(private readonly orders: OrdersService) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(
      () => void this.scan(),
      ORDER_EXPIRY_SCAN_INTERVAL_MS,
    );
    this.timer.unref();
    void this.scan();
  }

  scan(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.orders
      .expireUnpaidOrders()
      .then(() => undefined)
      .catch((error: unknown) => {
        this.logger.error(
          'Cannot expire unpaid orders; the next scan will retry',
          error instanceof Error ? error.message : String(error),
        );
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
}
