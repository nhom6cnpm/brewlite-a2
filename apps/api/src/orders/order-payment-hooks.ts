import type { EntityManager } from 'typeorm';
import type { CancellationReason } from './order-expiry';
import type { Order } from './order.entity';

/**
 * Interface between orders (#33) and payments (#34).
 * Orders never import Payment or the mock bank: PaymentsService registers
 * these hooks on startup via OrdersService.registerPaymentHooks().
 * Until #34 is merged no order has received money, so the defaults are no-ops.
 */
export interface OrderPaymentHooks {
  /** Money already arrived for this order: never auto-cancel it, staff decide. */
  hasReceivedTransfer(
    orderId: string,
    manager: EntityManager,
  ): Promise<boolean>;
  /**
   * Called inside the cancel transaction while the order row is locked,
   * before ingredients and voucher uses are released (refund, fail payments).
   */
  onOrderCancelled(
    order: Order,
    manager: EntityManager,
    reason: CancellationReason,
    now: Date,
  ): Promise<void>;
}

export const NO_PAYMENT_HOOKS: OrderPaymentHooks = {
  hasReceivedTransfer: () => Promise.resolve(false),
  onOrderCancelled: () => Promise.resolve(),
};
