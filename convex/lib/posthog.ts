'use node';

import { createHash } from 'node:crypto';

import { readAnalyticsConfiguration, validAnalyticsContext } from '../../shared/analytics';
import type { AnalyticsConfiguration } from '../../shared/analytics';
import type { PurchaseSnapshot } from './analytics.utils';

export const PURCHASE_RETRY_DELAYS_MS = [3_000, 15_000] as const;

export const purchaseEventUuid = (orderKey: string): string => {
  const hash = createHash('sha256').update(`hawaii:purchase_completed:${orderKey}`).digest('hex');
  const variant = ((parseInt(hash[16], 16) & 3) | 8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

export const purchasePayload = (
  snapshot: PurchaseSnapshot,
  configuration: AnalyticsConfiguration,
) => {
  if (!validAnalyticsContext(snapshot.context, configuration.environment) ||
    !Number.isSafeInteger(snapshot.amountCents) || snapshot.amountCents < 0 ||
    !Number.isSafeInteger(snapshot.quantity) || snapshot.quantity < 1 ||
    !Number.isSafeInteger(snapshot.confirmedAt) || snapshot.confirmedAt < 0 ||
    snapshot.confirmedAt > 8_640_000_000_000_000 ||
    !['applied', 'needs_review'].includes(snapshot.inventoryStatus)) return null;
  const uuid = purchaseEventUuid(snapshot.orderKey);
  return {
    api_key: configuration.projectToken,
    uuid,
    event: 'purchase_completed',
    distinct_id: snapshot.context.distinctId,
    timestamp: new Date(snapshot.confirmedAt).toISOString(),
    properties: {
      $insert_id: uuid,
      $session_id: snapshot.context.sessionId,
      $geoip_disable: true,
      $process_person_profile: false,
      environment: configuration.environment,
      source: 'stripe_webhook',
      currency: 'RON',
      amount_cents: snapshot.amountCents,
      value: snapshot.amountCents / 100,
      item_count: snapshot.quantity,
      inventory_status: snapshot.inventoryStatus,
      order_cancelled_at_confirmation: snapshot.cancelled,
    },
  };
};

export const sendPurchase = async (
  snapshot: PurchaseSnapshot,
  request: typeof fetch = fetch,
): Promise<'accepted' | 'retry' | 'discarded' | 'disabled'> => {
  let configuration: AnalyticsConfiguration | null;
  try {
    configuration = readAnalyticsConfiguration(process.env, false);
  } catch {
    return 'disabled';
  }
  if (!configuration) return 'disabled';
  const payload = purchasePayload(snapshot, configuration);
  if (!payload) return 'discarded';
  try {
    const response = await request(`${configuration.host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4_000),
    });
    if (response.ok) return 'accepted';
    return response.status === 429 || response.status >= 500 ? 'retry' : 'discarded';
  } catch {
    // Transport failures alone merit retries; configuration never blocks checkout.
    return 'retry';
  }
};
