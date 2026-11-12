export const RETURN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface OrderActionState {
  status: string;
  fulfillmentStatus?: string;
  inventoryStatus?: string;
  paymentConfirmedAt?: number;
  paymentMethod?: string;
  deliveredAt?: number;
  returnRequestedAt?: number;
}

// Mirrors convex/orders.ts cancelMine: the backend stays authoritative; this
// only decides whether the customer sees the cancel action.
export const canCancelOrder = (order: OrderActionState): boolean =>
  order.status !== 'cancelled' &&
  order.status !== 'shipped' &&
  order.status !== 'delivered' &&
  order.status !== 'returned' &&
  order.fulfillmentStatus !== 'packed' &&
  order.inventoryStatus === 'applied' &&
  (order.paymentConfirmedAt !== undefined || order.paymentMethod === 'cod');

// Mirrors requestReturnMine: delivered orders only, inside the legal
// 14-day window, at most one request.
export const canRequestReturn = (
  order: OrderActionState,
  now: number = Date.now(),
): boolean =>
  order.status === 'delivered' &&
  order.deliveredAt !== undefined &&
  now - order.deliveredAt <= RETURN_WINDOW_MS &&
  order.returnRequestedAt === undefined;
