/**
 * Courier list for manual AWB entry at fulfillment time. The order stores
 * only the carrier label; tracking links are derived from it here.
 */

export const CARRIERS = [
  { id: 'fan_courier', label: 'FAN Courier' },
  { id: 'sameday', label: 'Sameday' },
  { id: 'cargus', label: 'Cargus' },
] as const;

export type CarrierId = (typeof CARRIERS)[number]['id'];

// UI-only option: a courier outside the known list, typed by the operator.
export const OTHER_CARRIER_LABEL = 'Altul';

const TRACKING_URL_BUILDERS: Record<CarrierId, (awb: string) => string> = {
  fan_courier: (awb) =>
    `https://www.fancourier.ro/awb-tracking/?tracking=${encodeURIComponent(awb)}`,
  sameday: (awb) =>
    `https://sameday.ro/status-colet/?awb=${encodeURIComponent(awb)}`,
  cargus: (awb) =>
    `https://www.cargus.ro/personal/urmareste-coletul/?tracking_number=${encodeURIComponent(awb)}`,
};

export const getTrackingUrl = (
  carrier: string | undefined,
  awb: string | undefined,
): string | null => {
  const trimmedAwb = awb?.trim();
  const normalized = carrier?.trim().toLowerCase();
  if (!trimmedAwb || !normalized) return null;
  const match = CARRIERS.find(
    (entry) => entry.label.toLowerCase() === normalized,
  );
  if (!match) return null;
  return TRACKING_URL_BUILDERS[match.id](trimmedAwb);
};
