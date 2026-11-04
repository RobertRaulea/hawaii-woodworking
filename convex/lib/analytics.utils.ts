import { v } from 'convex/values';

import { readAnalyticsConfiguration, validAnalyticsContext } from '../../shared/analytics';
import type { AnalyticsContext } from '../../shared/analytics';
import type { Doc } from '../_generated/dataModel';
import { toCents } from './pos.utils';

export const analyticsContextValidator = v.object({
  consent: v.literal(true),
  distinctId: v.string(),
  sessionId: v.string(),
  environment: v.union(v.literal('test'), v.literal('production')),
});

export const purchaseSnapshotValidator = v.object({
  context: analyticsContextValidator,
  orderKey: v.string(),
  amountCents: v.number(),
  quantity: v.number(),
  confirmedAt: v.number(),
  inventoryStatus: v.union(v.literal('applied'), v.literal('needs_review')),
  cancelled: v.boolean(),
});

export type PurchaseSnapshot = {
  context: AnalyticsContext;
  orderKey: string;
  amountCents: number;
  quantity: number;
  confirmedAt: number;
  inventoryStatus: 'applied' | 'needs_review';
  cancelled: boolean;
};

// Optional telemetry must not prevent payment confirmation, even for corrupt legacy rows.
export const purchaseSnapshot = (order: Doc<'orders'>): PurchaseSnapshot | null => {
  try {
    const configuration = readAnalyticsConfiguration(process.env, false);
    if (!configuration || !validAnalyticsContext(order.analytics, configuration.environment) ||
      order.paymentConfirmedAt === undefined || !Number.isFinite(order.paymentConfirmedAt) ||
      order.paymentConfirmedAt < 0 ||
      (order.inventoryStatus !== 'applied' && order.inventoryStatus !== 'needs_review')) return null;
    const amountCents = toCents(order.total);
    if (!order.items.every((item) => Number.isSafeInteger(item.quantity) && item.quantity > 0)) return null;
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (!Number.isSafeInteger(quantity) || quantity < 1) return null;
    return {
      context: order.analytics,
      orderKey: order._id,
      amountCents,
      quantity,
      confirmedAt: order.paymentConfirmedAt,
      inventoryStatus: order.inventoryStatus,
      cancelled: order.status === 'cancelled',
    };
  } catch {
    return null;
  }
};
